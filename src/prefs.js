// import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
// import Graphene from 'gi://Graphene';
// import Pango from 'gi://Pango';
// import St from 'gi://St';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
// import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
// import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
// const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();

// const { Adw, Gdk, Gio, GLib, GObject, Gtk } = imports.gi;
// const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
// const _ = Gettext.gettext;
// TODO: Add proper translatation
const _ = (msg) => {
  return msg;
}

// const { AboutPage } = Me.imports.settings.AboutPage;
//
import { AboutPage as AboutPage } from './settings/AboutPage.js';
// import { DialogWindow as DialogWindow } from './settings/DialogWindow.js';
//
// const { DialogWindow } = Me.imports.settings.DialogWindow;
// const {WidgetsData} = Me.imports.settings.WidgetsData;
// const {WidgetSettingsPage} = Me.imports.settings.WidgetSettingsPage;
const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
];

// function init() {
//   // ExtensionUtils.initTranslations();
// }

export default class LuWOTDPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    if (!iconTheme.get_search_path().includes(`${this.path}/media`))
      iconTheme.add_search_path(`${this.path}/media`);

    const settings = this.getSettings();


    const homePage = new HomePage(settings);
    window.add(homePage);

    const aboutPage = new AboutPage(settings, this.metadata);
    window.add(aboutPage);

    // window.connect('close-request', () => {
    //     widgetsData.destroy();
    // });
  }
}

var HomePage = GObject.registerClass(
  class LuWOTDHomePage extends Adw.PreferencesPage {
    _init(settings) {
      super._init({
        title: _('Settings'),
        icon_name: 'preferences-system-symbolic',
        name: 'HomePage',
      });

      this._settings = settings;

      // -- Adding settings for the Label with the word of the day
      this.addGeneralSettings();
      this.addWotdSettings();
      this.addMeaningSettings();
    }

    get settings() {
      return this._settings;
    }

    addGeneralSettings() {
      const generalGroup = new Adw.PreferencesGroup({
      });
      let hasBackground = this.settings.get_boolean("has-background") || false;
      let hasBorder = this.settings.get_boolean("has-border") || false;

      this.add(generalGroup);
      this.createLanguagesRows(generalGroup);

      const backgroundRow = new Adw.ExpanderRow({
        title: _('Has Background'),
        show_enable_switch: true,
        expanded: hasBackground,
        enable_expansion: hasBackground,
      });

      backgroundRow.connect('notify::enable-expansion', widget => {
        this.settings.set_boolean('has-background', widget.enable_expansion);
      });

      const backgroungColorRow = this.createColorRow(_('Background Color'), 'background-color');
      backgroundRow.add_row(backgroungColorRow);
      generalGroup.add(backgroundRow);

      const borderRow = new Adw.ExpanderRow({
        title: _('Has Border'),
        show_enable_switch: true,
        expanded: hasBorder,
        enable_expansion: hasBorder,
      });

      borderRow.connect('notify::enable-expansion', widget => {
        this.settings.set_boolean('has-border', widget.enable_expansion);
      });

      const borderColorRow = this.createColorRow(_('Border Color'), 'border-color');
      borderRow.add_row(borderColorRow);

      const borderRadiusRow = this.createSpinRow(_('Border Radius'), 'border-radius', 0, 30);
      borderRow.add_row(borderRadiusRow);

      const borderWidthRow = this.createSpinRow(_('Width'), 'border-width', 0, 30);
      borderRow.add_row(borderWidthRow);


      generalGroup.add(borderRow);

      const posXRow = this.createSpinRow(_('Position X'), 'pos-x', 0, 20000);
      generalGroup.add(posXRow);

      const posYRow = this.createSpinRow(_('Position Y'), 'pos-y', 0, 20000);
      generalGroup.add(posYRow);

    }
    createLanguagesRows(group) {
      let selectedLanguages = this.settings.get_strv('selected-languages') || ['en']; // Default to English
      const translationsRow = new Adw.ExpanderRow({
        title: _('Displayed Translations'),
        show_enable_switch: false,
        expanded: false,
        enable_expansion: true,
      });
      group.add(translationsRow);
      languages.forEach(lang => {
        let langRow = this.createBooleanSwitch(lang, selectedLanguages.includes(lang.code), (state) => {
          if (state === true && !selectedLanguages.includes(lang.code)) {
            selectedLanguages.push(lang.code);
          } else if (state === false && selectedLanguages.includes(lang.code)) {
            selectedLanguages.splice(selectedLanguages.indexOf(lang.code), 1);
          }
          log('Setting language ' + lang.code + ' to ' + state.toString() + ' (' + selectedLanguages.toString() + ')');
          this.settings.set_strv('selected-languages', selectedLanguages);
        });
        translationsRow.add_row(langRow);
      });



      // Set the current language selection
    }

    addWotdSettings() {

      this.wotdGroup = new Adw.PreferencesGroup({
        title: _('Word of the Day'),
      });
      this.add(this.wotdGroup);
      let wotdHasShadow = this.settings.get_boolean("wotd-has-shadow");
      let wotdFontFamily = this.settings.get_string("wotd-font-family");

      const wotdFontButton = new Gtk.FontButton({
        valign: Gtk.Align.CENTER,
        use_size: false,
        use_font: true,
        level: Gtk.FontChooserLevel.FAMILY, // | Gtk.FontChooserLevel.STYLE,
        font: wotdFontFamily,
      });

      const wotdFontRow = new Adw.ActionRow({
        title: _('Font Family'),
      });


      wotdFontButton.connect('notify::font', widget => {
        this.settings.set_string('wotd-font-family', widget.font);
      });
      wotdFontRow.add_suffix(wotdFontButton);


      const wotdFontExpanderRow = new Adw.ExpanderRow({
        title: _('Override Font Family'),
        show_enable_switch: true,
        expanded: true,
        enable_expansion: true,
      });
      // wotdFontExpanderRow.connect('notify::enable-expansion', widget => {
      //   this.settings.set('Text_CustomFontEnabled', widget.enable_expansion);
      // });
      wotdFontExpanderRow.add_row(wotdFontRow);
      this.wotdGroup.add(wotdFontExpanderRow);



      const wotdFontSizeRow = this.createSpinRow(_('Font Size'), 'wotd-font-size', 8, 200);
      this.wotdGroup.add(wotdFontSizeRow);

      const textColorRow = this.createColorRow(_('Text Color'), 'wotd-font-color');
      this.wotdGroup.add(textColorRow);



      const wotdHasShadowExpanderRow = new Adw.ExpanderRow({
        title: _('Enable Text Shadow'),
        show_enable_switch: true,
        expanded: false,
        enable_expansion: true,
      });

      this.wotdGroup.add(wotdHasShadowExpanderRow);
      wotdHasShadowExpanderRow.connect('notify::enable-expansion', widget => {
        this.settings.set_boolean('wotd-has-shadow', widget.enable_expansion);
      });

      const wotdShadowColorRow = this.createColorRow(_('Shadow Color'), 'wotd-shadow-color');
      wotdHasShadowExpanderRow.add_row(wotdShadowColorRow);


      const wotdShadowXRow = this.createSpinRow(_('Shadow X offset'), 'wotd-shadow-x', -20, 20);
      wotdHasShadowExpanderRow.add_row(wotdShadowXRow);

      const wotdShadowYRow = this.createSpinRow(_('Shadow Y offset'), 'wotd-shadow-y', -20, 20);
      wotdHasShadowExpanderRow.add_row(wotdShadowYRow);

      const wotdShadowSpreadRow = this.createSpinRow(_('Shadow spread'), 'wotd-shadow-offset', 0, 20);
      wotdHasShadowExpanderRow.add_row(wotdShadowSpreadRow);

      const wotdShadowBlurRow = this.createSpinRow(_('Shadow Blur'), 'wotd-shadow-blur', -20, 20);
      wotdHasShadowExpanderRow.add_row(wotdShadowBlurRow);
    }

    addMeaningSettings() {

      this.meaningGroup = new Adw.PreferencesGroup({
        title: _('Meaning'),
        description: _('Set of styles for translations.'),
      });
      this.add(this.meaningGroup);
      let meaningFontFamily = this.settings.get_string("meaning-font-family");

      const meaningFontButton = new Gtk.FontButton({
        valign: Gtk.Align.CENTER,
        use_size: false,
        use_font: true,
        level: Gtk.FontChooserLevel.FAMILY, // | Gtk.FontChooserLevel.STYLE,
        font: meaningFontFamily,
      });

      const meaningFontRow = new Adw.ActionRow({
        title: _('Font Family'),
      });


      meaningFontButton.connect('notify::font', widget => {
        this.settings.set_string('meaning-font-family', widget.font);
      });
      meaningFontRow.add_suffix(meaningFontButton);


      const meaningFontExpanderRow = new Adw.ExpanderRow({
        title: _('Override Font Family'),
        show_enable_switch: true,
        expanded: true,
        enable_expansion: true,
      });
      // meaningFontExpanderRow.connect('notify::enable-expansion', widget => {
      //   this.settings.set('Text_CustomFontEnabled', widget.enable_expansion);
      // });
      meaningFontExpanderRow.add_row(meaningFontRow);
      this.meaningGroup.add(meaningFontExpanderRow);



      const meaningFontSizeRow = this.createSpinRow(_('Font Size'), 'meaning-font-size', 8, 200);
      this.meaningGroup.add(meaningFontSizeRow);

      const textColorRow = this.createColorRow(_('Text Color'), 'meaning-font-color');
      this.meaningGroup.add(textColorRow);



      const meaningHasShadowExpanderRow = new Adw.ExpanderRow({
        title: _('Enable Text Shadow'),
        show_enable_switch: true,
        expanded: false,
        enable_expansion: true,
      });

      this.meaningGroup.add(meaningHasShadowExpanderRow);
      meaningHasShadowExpanderRow.connect('notify::enable-expansion', widget => {
        this.settings.set_boolean('meaning-has-shadow', widget.enable_expansion);
      });

      const meaningShadowColorRow = this.createColorRow(_('Shadow Color'), 'meaning-shadow-color');
      meaningHasShadowExpanderRow.add_row(meaningShadowColorRow);


      const meaningShadowXRow = this.createSpinRow(_('Shadow X offset'), 'meaning-shadow-x', -20, 20);
      meaningHasShadowExpanderRow.add_row(meaningShadowXRow);

      const meaningShadowYRow = this.createSpinRow(_('Shadow Y offset'), 'meaning-shadow-y', -20, 20);
      meaningHasShadowExpanderRow.add_row(meaningShadowYRow);

      const meaningShadowSpreadRow = this.createSpinRow(_('Shadow spread'), 'meaning-shadow-offset', 0, 20);
      meaningHasShadowExpanderRow.add_row(meaningShadowSpreadRow);

      const meaningShadowBlurRow = this.createSpinRow(_('Shadow Blur'), 'meaning-shadow-blur', -20, 20);
      meaningHasShadowExpanderRow.add_row(meaningShadowBlurRow);
    }


    createBooleanSwitch(lang, state, stateChanged) {
      const gtkSwitch = new Gtk.Switch({ hexpand: true, halign: Gtk.Align.END });
      log(lang.toString());
      log(state);
      log(stateChanged);
      gtkSwitch.set_active(state);
      gtkSwitch.set_valign(Gtk.Align.CENTER);
      gtkSwitch.connect('state-set', (sw) => {
        const newval = sw.get_active();
        stateChanged(newval);
      });

      const row = new Adw.ActionRow({
        title: _(lang.name),
        activatable_widget: gtkSwitch,
      });
      row.add_suffix(gtkSwitch);
      return row;
    }

    createSpinRow(title, setting, lower, upper, digits = 0) {
      const value = this.settings.get_int(setting) || 0;
      const spinButton = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
          lower, upper, step_increment: 1, page_increment: 1, page_size: 0,
        }),
        climb_rate: 1,
        digits,
        numeric: true,
        valign: Gtk.Align.CENTER,
      });
      spinButton.set_value(value);
      spinButton.connect('value-changed', widget => {
        this.settings.set_int(setting, widget.get_value());
      });
      const spinRow = new Adw.ActionRow({
        title: _(title),
        activatable_widget: spinButton,
      });

      spinRow.setValue = newValue => {
        spinButton.set_value(newValue);
      };

      spinRow.add_suffix(spinButton);
      return spinRow;
    }

    createColorRow(title, setting) {
      const value = this.settings.get_string(setting);
      let rgba = new Gdk.RGBA();
      rgba.parse(value ?? '');
      const colorButton = new Gtk.ColorButton({
        rgba,
        use_alpha: true,
        valign: Gtk.Align.CENTER,
      });
      colorButton.connect('color-set', widget => {
        this.settings.set_string(setting, widget.get_rgba().to_string());
      });
      const colorRow = new Adw.ActionRow({
        title: _(title),
        activatable_widget: colorButton,
      });
      colorRow.add_suffix(colorButton);

      colorRow.setValue = newValue => {
        rgba = new Gdk.RGBA();
        rgba.parse(newValue);
        colorButton.set_rgba(rgba);
      };
      return colorRow;
    }
  });




