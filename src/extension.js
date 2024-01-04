/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 *
 * @author Adam Druzd (https://github.com/Praczet)
 * @version 2.0
 * @date 2024-01-03
 */

const DEBUG_LOG = true;

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let SETTINGS, EXTENSION;

/** This object contains the default settings. Exact information can be found in schemas/org.gnome.shell.extensions.luwotd.gschema.xml */
const LuWOTD_Settings = {
  wotd_font_size: 50,
  wotd_font_family: "OpenDyslexicAlta",
  wotd_font_color: "#ffffff",
  wotd_has_shadow: true,
  wotd_text_shadow_color: "#00000066",
  wotd_text_shadow_x: 2,
  wotd_text_shadow_y: 2,
  wotd_text_shadow_blur: 4,
  wotd_text_shadow_offset: 0,

  meaning_font_size: 24,
  meaning_font_family: "OpenDyslexicAlta",
  meaning_font_color: "rgba(255, 255, 255, 0.8)",
  meaning_has_shadow: true,
  meaning_text_shadow_color: "rgba(28, 28, 28, 0.8)",
  meaning_text_shadow_x: 2,
  meaning_text_shadow_y: 2,
  meaning_text_shadow_blur: 4,
  meaning_text_shadow_offset: 0,

  fetch_time_hour: 9,
  fetch_time_minute: 0,

  has_shadow: true,

  has_background: false,
  background_color: "rgba(107, 40, 111, 0.8)",

  has_border: false,
  border_radius: 50,
  border_width: 0,
  border_color: "transparent",

  padding: "0px 30px 20px 30px",
  backdrop_filter: "backdrop-filter: blur(5px);",

  pos_x: 300,
  pos_y: 100,
};

/**
 * displays message
 *
 * @param {any} msg - Message to display
 */
function debugLog(msg) {
  if (DEBUG_LOG) console.debug(msg);
}

/** Label Class  used to display word of the day or translation */
const Label = GObject.registerClass(
  class LuWOTDLabel extends St.Label {
    _init() {
      super._init({
        y_align: Clutter.ActorAlign.CENTER,
        pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 }),
      });
      this.clutter_text.set({
        ellipsize: Pango.EllipsizeMode.None,
      });
      // let try OpenDyslexic Font
      const fontDesc = Pango.FontDescription.from_string(
        LuWOTD_Settings.wotd_font_family,
      );
      const ff = `font-family: ${fontDesc.get_family()}; `;
      // Adding shadow to text (just testt)
      this.style = `color: ${LuWOTD_Settings.wotd_font_color}; 
        font-size: ${LuWOTD_Settings.wotd_font_size}pt; 
        font-feature-settings: "tnum"; 
        text-shadow: 
            ${LuWOTD_Settings.wotd_text_shadow_x}px 
            ${LuWOTD_Settings.wotd_text_shadow_y}px 
            ${LuWOTD_Settings.wotd_text_shadow_blur}px 
            ${LuWOTD_Settings.wotd_text_shadow_offset}px 
            ${LuWOTD_Settings.wotd_text_shadow_color}; 
        ${ff}`;
    }
  },
);

/** In fact it could be as part of the Label Class, but for the future it is better to use TextLabel */
const TextLabel = GObject.registerClass(
  class LuWOTDTextLabel extends Label {
    _init() {
      super._init();
    }

    /**
     * Sets style of thr parent Class (Label)
     *
     */
    setStyle() {
      super.setStyle();
    }

    /**
     * Sets the text for the Label
     *
     * @param {string} text - Text to display
     */
    setText(text) {
      this.clutter_text.set_markup(text);
    }
  },
);

const LuWidget = GObject.registerClass(
  class LuWOTDWidget extends St.Widget {
    _init() {
      super._init({
        layout_manager: new Clutter.BoxLayout(),
        reactive: true,
        trackHover: true,
        can_focus: true,
        x_align: Clutter.ActorAlign.FILL,
        y_align: Clutter.ActorAlign.FILL,
        pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 }),
      });
      this.layout_manager.orientation = Clutter.Orientation.VERTICAL;

      this.meanings = [];
      this.laoded = false;
      this._settings = EXTENSION.getSettings();
      this.my_settings = {};

      this.langs = this.settings.get_strv("selected-languages") || ["en", "fr"];

      this.set_x(this.settings.get_int("pos-x") || LuWOTD_Settings.pos_x);
      this.set_y(this.settings.get_int("pos-y") || LuWOTD_Settings.pos_y);
      this.createElements();

      this.wotdURI = "https://lod.lu/api/en/word-of-the-day";
      this.meaningsURI = "https://lod.lu/api/en/entry/";
      this.wotdArticleURI = "https://lod.lu/artikel/";

    }

    get settings() {
      if (!this._settings) {
        this._settings = SETTINGS;
      }
      return this._settings;
    }

    setOwnStyle() {
      let has_background =
        this.settings.get_boolean("has-background") ||
        LuWOTD_Settings.has_background;
      let has_border =
        this.settings.get_boolean("has-border") || LuWOTD_Settings.has_border;

      let style = "";
      if (has_background) {
        let background_color =
          this.settings.get_string("background-color") ||
          LuWOTD_Settings.background_color;
        style += ` background-color: ${background_color}; `;
        style += LuWOTD_Settings.backdrop_filter;
      }
      if (has_border) {
        let border_radius =
          this.settings.get_int("border-radius") ||
          LuWOTD_Settings.border_radius;
        let border_width =
          this.settings.get_int("border-width") || LuWOTD_Settings.border_width;
        let border_color =
          this.settings.get_string("border-color") ||
          LuWOTD_Settings.border_color;
        style += ` border-radius: ${border_radius}px; `;
        style += ` border: ${border_width}px solid ${border_color}; `;
      }

      // FIXME: Add this to settings
      style += ` padding: ${LuWOTD_Settings.padding}; `;
      this.style = style;
    }

    getWOTDStyle() {
      let fontSize =
        this.settings.get_int("wotd-font-size") ||
        LuWOTD_Settings.wotd_font_size;
      let fontFamily =
        this.settings.get_string("wotd-font-family") ||
        LuWOTD_Settings.wotd_font_family;
      let textColor =
        this.settings.get_string("wotd-font-color") ||
        LuWOTD_Settings.wotd_font_color;
      let hasShadow =
        this.settings.get_boolean("wotd-has-shadow") ||
        LuWOTD_Settings.wotd_has_shadow;

      let style = "";

      style = `color: ${textColor}; 
          font-size: ${fontSize}pt; 
          font-family: ${this.getFontFamilyName(fontFamily)}; 
          `;
      if (hasShadow) {
        let textShadowColor =
          this.settings.get_string("wotd-shadow-color") ||
          LuWOTD_Settings.wotd_text_shadow_color;
        let textShadowX =
          this.settings.get_int("wotd-shadow-x") ||
          LuWOTD_Settings.wotd_text_shadow_x;
        let textShadowY =
          this.settings.get_int("wotd-shadow-y") ||
          LuWOTD_Settings.wotd_text_shadow_y;
        let textShadowBlur =
          this.settings.get_int("wotd-shadow-blur") ||
          LuWOTD_Settings.wotd_text_shadow_blur;
        let textShadowOffset =
          this.settings.get_int("wotd-shadow-offset") ||
          LuWOTD_Settings.wotd_text_shadow_offset;
        style += `text-shadow: ${textShadowX}px ${textShadowY}px ${textShadowBlur}px ${textShadowOffset}px ${textShadowColor}; `;
      }
      return style;
    }

    getFontFamilyName(font) {
      const fontDesc = Pango.FontDescription.from_string(font);
      return fontDesc.get_family();
    }

    getMeaningStyle() {
      let fontSize =
        this.settings.get_int("meaning-font-size") ||
        LuWOTD_Settings.meaning_font_size;
      let fontFamily =
        this.settings.get_string("meaning-font-family") ||
        LuWOTD_Settings.meaning_font_family;
      let textColor =
        this.settings.get_string("meaning-font-color") ||
        LuWOTD_Settings.meaning_font_color;
      let hasShadow =
        this.settings.get_boolean("meaning-has-shadow") ||
        LuWOTD_Settings.meaning_has_shadow;

      let style = "";

      style = `color: ${textColor}; 
          font-size: ${fontSize}pt; 
          font-family: ${this.getFontFamilyName(fontFamily)}; 
          `;
      if (hasShadow) {
        let textShadowColor =
          this.settings.get_string("meaning-shadow-color") ||
          LuWOTD_Settings.meaning_text_shadow_color;
        let textShadowX =
          this.settings.get_int("meaning-shadow-x") ||
          LuWOTD_Settings.meaning_text_shadow_x;
        let textShadowY =
          this.settings.get_int("meaning-shadow-y") ||
          LuWOTD_Settings.meaning_text_shadow_y;
        let textShadowBlur =
          this.settings.get_int("meaning-shadow-blur") ||
          LuWOTD_Settings.meaning_text_shadow_blur;
        let textShadowOffset =
          this.settings.get_int("meaning-shadow-offset") ||
          LuWOTD_Settings.meaning_text_shadow_offset;
        style += `text-shadow: ${textShadowX}px ${textShadowY}px ${textShadowBlur}px ${textShadowOffset}px ${textShadowColor}; `;
      }
      return style;
    }

    createElements() {
      this.destroy_all_children();
      this.setOwnStyle();

      let defaultWord = this.settings.get_string("last-word") || "Error";
      let defaultLangs = [
        {
          lang: "en",
          label: "[en]: " + this.settings.get_string("last-en") || "~e",
        },
        {
          lang: "fr",
          label: "[fr]: " + this.settings.get_string("last-fr") || "~f",
        },
        {
          lang: "de",
          label: "[de]: " + this.settings.get_string("last-de") || "~d",
        },
        {
          lang: "pt",
          label: "[pt]: " + this.settings.get_string("last-pt") || "~p",
        },
      ];
      if (!defaultLangs || defaultLangs.length === 0) {
        defaultLangs = [{ lang: "en", label: "~e" }];
      }

      this.wotd = new TextLabel();
      this.wotd.setText(defaultWord);
      this.wotd.style = this.getWOTDStyle();
      this.add_child(this.wotd);

      let meaningStyle = this.getMeaningStyle();
      this.langs.forEach((lang) => {
        const meaning = new TextLabel();
        this.add_child(meaning);
        if (defaultLangs && Array.isArray(defaultLangs)) {
          let langEntry = defaultLangs.find((m) => m.lang === lang);
          meaning.setText(langEntry ? langEntry.label : "!");
        } else {
          meaning.setText("~");
        }
        meaning.style = meaningStyle;
        this.meanings.push({ lang: lang, meaning: meaning });
      });
      this.queue_relayout();
    }

    getNewWord() {
      debugLog("getNewWord");
      this.loadJsonFromUrl(this.wotdURI, (jsonData) => {
        debugLog(`${jsonData}`);
        try {
          debugLog(JSON.stringify(jsonData));
        } catch (e) {
          debugLog(`${jsonData}`);
        }
        if (jsonData.hasOwnProperty("lemma")) {
          this.wotd.setText(jsonData.lemma);
          this.settings.set_string("last-word", jsonData.lemma);
          const newDateTime = GLib.DateTime.new_now_utc();
          const newTimestamp = newDateTime.to_unix();
          this.settings.set_uint64("last-fetch", newTimestamp);
          if (jsonData.hasOwnProperty("lod_id")) {
            this.getMeaning(jsonData.lod_id);
          } else {
            this.setEmptyMeaning();
          }
        }
      });
    }

    setEmptyMeaning() {
      this.langs.forEach((lang) => {
        const meaning = this.meanings.find((m) => m.lang === lang);
        if (meaning) meaning.meaning.setText("");
      });
    }

    getMeaning(lod_id) {
      debugLog(`getMeaning ${lod_id}`);
      this.loadJsonFromUrl(`${this.meaningsURI}${lod_id}`, (jsonData) => {
        debugLog(JSON.stringify(jsonData));
        if (
          jsonData.hasOwnProperty("entry") &&
          jsonData.entry.hasOwnProperty("microStructures") &&
          jsonData.entry.microStructures.length > 0 &&
          jsonData.entry.microStructures[0].hasOwnProperty(
            "grammaticalUnits",
          ) &&
          jsonData.entry.microStructures[0].grammaticalUnits.length > 0 &&
          jsonData.entry.microStructures[0].grammaticalUnits[0].hasOwnProperty(
            "meanings",
          ) &&
          jsonData.entry.microStructures[0].grammaticalUnits[0].meanings
            .length > 0 &&
          jsonData.entry.microStructures[0].grammaticalUnits[0].meanings[0].hasOwnProperty(
            "targetLanguages",
          )
        ) {
          let shorty =
            jsonData.entry.microStructures[0].grammaticalUnits[0].meanings[0]
              .targetLanguages;
          const noLangs = this.langs.length;
          this.laoded = true;
          this.langs.forEach((lang) => {
            const prefix = noLangs > 0 ? `[${lang}]: ` : "";
            const meaning = this.meanings.find((m) => m.lang === lang);
            if (meaning) {
              if (
                shorty.hasOwnProperty(lang) &&
                shorty[lang].hasOwnProperty("parts") &&
                shorty[lang].parts.length > 0 &&
                shorty[lang].parts[0].hasOwnProperty("content")
              ) {
                meaning.meaning.setText(prefix + shorty[lang].parts[0].content);
                this.settings.set_string(
                  "last-" + lang,
                  shorty[lang].parts[0].content,
                );
              } else {
                meaning.meaning.setText("");
              }
            } else {
              meaning.meaning.setText("");
            }
          });
        }
      });
    }

    hasTodayWord() {
      return this.loaded;
    }

    loadJsonFromUrl(url, callback) {
      const Decoder = new TextDecoder("utf-8");
      debugLog(`Loading JSON from URL: ${url}`);
      const file = Gio.File.new_for_uri(url);
      file.load_contents_async(null, (file, result) => {
        try {
          const [success, contents] = file.load_contents_finish(result);
          if (success) {
            debugLog(`Success:? :: ${Decoder.decode(contents)}`);
            const jsonData = JSON.parse(Decoder.decode(contents));
            callback(jsonData);
          } else {
            debugLog(`Error loading JSON from URL: ${file.get_uri()}`);
          }
        } catch (error) {
          debugLog(`Error parsing JSON data: ${error.message}`);
        }
      });
    }

    showNotification(addText) {
      const notification = new Gio.Notification();
      notification.set_title("Notification Title");
      notification.set_body(addText);

      const id = notification.add_button("OK", "app.ok");

      Main.notify("my-extension-name", id, notification);
    }

    openWebPage(url) {
      try {
        const appInfo = Gio.AppInfo.create_from_commandline(
          "xdg-open",
          null,
          Gio.AppInfoCreateFlags.NONE,
        );
        appInfo.launch_uris([url], null);
        debugLog(`Opening web page: ${url}`);
      } catch (error) {
        debugLog(`Error opening web page: ${error.message}`);
      }
    }
    updateWidget(_settings, _key) {
      // It could be improved... by changing the setting according to the key
      this.set_x(this.settings.get_int("pos-x") || LuWOTD_Settings.pos_x);
      this.set_y(this.settings.get_int("pos-y") || LuWOTD_Settings.pos_y);
      this.setOwnStyle();
      if (this.wotd) {
        this.wotd.style = this.getWOTDStyle();
      }
      this.meanings.forEach((meaning) => { if (meaning.meaning) meaning.meaning.style = this.getMeaningStyle(); });

    }
  },
);

export default class LuWOTD extends Extension {
  enable() {
    EXTENSION = this;
    SETTINGS = this.getSettings();

    this.fetchTimer = 0;
    this.retryTimer = 0;

    this.luWidget = new LuWidget();

    Main.layoutManager._backgroundGroup.add_child(this.luWidget);

    this.luWidget.settings.connect("changed", (settings, key) => {
      this.luWidget.updateWidget(settings, key);
    });

    this.scheduleFetchAt(
      LuWOTD_Settings.wotd_hour,
      LuWOTD_Settings.wotd_minute,
    );
    this.fetchWord();
  }

  disable() {
    Main.layoutManager._backgroundGroup.remove_child(this.luWidget);
    // Main.layoutManager.disconnectObject(this);
    if (this.fetchTimer > 0) {
      GLib.source_remove(this.fetchTimer);
      this.fetchTimer = 0;
    }
    if (this.retryTimer > 0) {
      GLib.source_remove(this.retryTimer);
      this.retryTimer = 0;
    }
    this.luWidget = null;
    EXTENSION = null;
    SETTINGS = null;
  }

  scheduleFetchAt(hour, minute) {
    // Calculate the timestamp for the specified time
    const now = new Date();
    const targetTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
    );
    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1); // Schedule for the next day if it's already passed
    }

    // Calculate the delay in milliseconds
    const delay = targetTime - now;

    // Schedule the fetch timer
    this.fetchTimer = GLib.timeout_add(GLib.PRIORITY_HIGH, delay, () => {
      // Fetch the word here
      this.fetchWord();
      return false; // Don't repeat the timer
    });
  }

  fetchWord() {
    this.retryTimer = GLib.timeout_add(GLib.PRIORITY_HIGH, 5000, () => {
      debugLog("fetchWord");
      // Fetch the word here
      if (!this.luWidget.hasTodayWord()) {
        this.luWidget.getNewWord();
      } else {
        return false; // Don't repeat the timer
      }
    });
  }
}

