
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Adw, Gdk, Gio, GLib, GObject, Gtk } = imports.gi;
// const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
// const _ = Gettext.gettext;

const PROJECT_DESCRIPTION = 'Add a Word of the Day to your Desktop';
const PROJECT_IMAGE = 'logo-luwotd';
const LOD_IMAGE = 'lod-logo';
const SCHEMA_PATH = '/org/gnome/shell/extensions/lu-wotd/';

const _ = (msg) => {
  return msg;
}

var AboutPage = GObject.registerClass(
  class LuWOTDAboutPage extends Adw.PreferencesPage {
    _init() {
      super._init({
        title: _('About'),
        icon_name: 'help-about-symbolic',
        name: 'AboutPage',
      });

      const projectHeaderGroup = new Adw.PreferencesGroup();
      const projectHeaderBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: false,
        vexpand: false,
      });

      const projectImage = new Gtk.Image({
        margin_bottom: 5,
        icon_name: PROJECT_IMAGE,
        pixel_size: 100,
      });

      const lodImage = new Gtk.Image({
        icon_name: LOD_IMAGE,
        pixel_size: 100,
        valign: Gtk.Align.CENTER,
      });

      const projectTitleLabel = new Gtk.Label({
        label: _('Luxembourgish Word of the Day'),
        css_classes: ['title-1'],
        vexpand: true,
        valign: Gtk.Align.FILL,
      });

      const projectDescriptionLabel = new Gtk.Label({
        label: _(PROJECT_DESCRIPTION),
        hexpand: false,
        vexpand: false,
      });
      projectHeaderBox.append(projectImage);
      projectHeaderBox.append(projectTitleLabel);
      projectHeaderBox.append(projectDescriptionLabel);
      projectHeaderGroup.add(projectHeaderBox);

      this.add(projectHeaderGroup);
      // -----------------------------------------------------------------------

      // Extension/OS Info and Links Group------------------------------------------------
      const infoGroup = new Adw.PreferencesGroup();

      const projectVersionRow = new Adw.ActionRow({
        title: _('Lu-WotD Version'),
      });
      projectVersionRow.add_suffix(new Gtk.Label({
        label: Me.metadata.version.toString(),
        css_classes: ['dim-label'],
      }));
      infoGroup.add(projectVersionRow);

      if (Me.metadata.commit) {
        const commitRow = new Adw.ActionRow({
          title: _('Git Commit'),
        });
        commitRow.add_suffix(new Gtk.Label({
          label: Me.metadata.commit.toString(),
          css_classes: ['dim-label'],
        }));
        infoGroup.add(commitRow);
      }

      const gnomeVersionRow = new Adw.ActionRow({
        title: _('GNOME Version'),
      });
      gnomeVersionRow.add_suffix(new Gtk.Label({
        label: imports.misc.config.PACKAGE_VERSION.toString(),
        css_classes: ['dim-label'],
      }));
      infoGroup.add(gnomeVersionRow);

      const osRow = new Adw.ActionRow({
        title: _('OS Name'),
      });

      const name = GLib.get_os_info('NAME');
      const prettyName = GLib.get_os_info('PRETTY_NAME');

      osRow.add_suffix(new Gtk.Label({
        label: prettyName ? prettyName : name,
        css_classes: ['dim-label'],
      }));
      infoGroup.add(osRow);

      const sessionTypeRow = new Adw.ActionRow({
        title: _('Windowing System'),
      });
      sessionTypeRow.add_suffix(new Gtk.Label({
        label: GLib.getenv('XDG_SESSION_TYPE') === 'wayland' ? 'Wayland' : 'X11',
        css_classes: ['dim-label'],
      }));
      infoGroup.add(sessionTypeRow);

      const gitlabRow = this._createLinkRow(_('Lu-WotD on Github'), Me.metadata.url);
      infoGroup.add(gitlabRow);

      // const donateRow = this._createLinkRow(_('Donate via PayPal'), PAYPAL_LINK);
      // infoGroup.add(donateRow);

      this.add(infoGroup);



      // last fetched WOTD -----------------------------------------------------------------------
      const lastWOTDGroup = new Adw.PreferencesGroup();

      const lastWOTDRow = new Adw.ActionRow({
        title: _('Last fetched Word of the Day'),
      });
      const settings = ExtensionUtils.getSettings();

      const sLastWord = settings.get_string('last-word') || "Error";

      const currentTimestamp = settings.get_uint64('last-fetch') || 0;
      const currentDateTime = GLib.DateTime.new_from_unix_utc(currentTimestamp);

      // const lwEn = settings.get_string('last-en') || "~en";
      // const lwDe = settings.get_string('last-de') || "~de";
      // const lwFr = settings.get_string('last-fr') || "~fr";
      // const lwPt = settings.get_string('last-pt') || "~pt";

      lastWOTDRow.add_suffix(new Gtk.Label({
        label: sLastWord,
        css_classes: ['dim-label'],
      }));
      lastWOTDGroup.add(lastWOTDRow);

      const lwfRow = new Adw.ActionRow({
        title: _('Fetched'),
      });

      lwfRow.add_suffix(new Gtk.Label({
        label: currentDateTime.format('%Y-%m-%d %H:%M:%S'),
        css_classes: ['dim-label'],
      }));
      lastWOTDGroup.add(lwfRow);

      this.add(lastWOTDGroup);

      // Save/Load Settings----------------------------------------------------------
      const settingsGroup = new Adw.PreferencesGroup();
      const settingsRow = new Adw.ActionRow({
        title: _('Lu-WotD Settings'),
      });
      const loadButton = new Gtk.Button({
        label: _('Load'),
        valign: Gtk.Align.CENTER,
      });
      loadButton.connect('clicked', () => {
        this._showFileChooser(
          _('Load Settings'),
          { action: Gtk.FileChooserAction.OPEN },
          '_Open',
          filename => {
            if (filename && GLib.file_test(filename, GLib.FileTest.EXISTS)) {
              const settingsFile = Gio.File.new_for_path(filename);
              // eslint-disable-next-line prefer-const
              let [success_, pid_, stdin, stdout, stderr] =
                GLib.spawn_async_with_pipes(
                  null,
                  ['dconf', 'load', SCHEMA_PATH],
                  null,
                  GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                  null
                );

              stdin = new Gio.UnixOutputStream({ fd: stdin, close_fd: true });
              GLib.close(stdout);
              GLib.close(stderr);

              stdin.splice(settingsFile.read(null),
                Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);
            }
          }
        );
      });
      const saveButton = new Gtk.Button({
        label: _('Save'),
        valign: Gtk.Align.CENTER,
      });
      saveButton.connect('clicked', () => {
        this._showFileChooser(
          _('Save Settings'),
          { action: Gtk.FileChooserAction.SAVE },
          '_Save',
          filename => {
            const file = Gio.file_new_for_path(filename);
            const raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
            const out = Gio.BufferedOutputStream.new_sized(raw, 4096);

            out.write_all(GLib.spawn_command_line_sync(`dconf dump ${SCHEMA_PATH}`)[1], null);
            out.close(null);
          }
        );
      });
      settingsRow.add_suffix(saveButton);
      settingsRow.add_suffix(loadButton);
      settingsGroup.add(settingsRow);
      this.add(settingsGroup);


      //  Lod.lu ----------------------------------------------------------
      const lodGroup = new Adw.PreferencesGroup({
      });

      const lodRow = new Adw.ActionRow({
        activatable: true,
        title: _('The Word of The Day is provided by:\nLëtzebuerger Online Dictionnaire'),
      });
      lodGroup.add(lodRow);

      lodRow.connect('activated', () => {
        Gtk.show_uri(this.get_root(), 'https://www.lod.lu/', Gdk.CURRENT_TIME);
      });
      lodRow.add_suffix(lodImage);
      this.add(lodGroup);



      // -----------------------------------------------------------------------

      const gnuSoftwareGroup = new Adw.PreferencesGroup();
      const gnuSofwareLabel = new Gtk.Label({
        label: _(GNU_SOFTWARE),
        use_markup: true,
        justify: Gtk.Justification.CENTER,
      });
      const gnuSofwareLabelBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        valign: Gtk.Align.END,
        vexpand: true,
      });
      gnuSofwareLabelBox.append(gnuSofwareLabel);
      gnuSoftwareGroup.add(gnuSofwareLabelBox);
      this.add(gnuSoftwareGroup);



    }

    _createLinkRow(title, uri) {
      const image = new Gtk.Image({
        icon_name: 'adw-external-link-symbolic',
        valign: Gtk.Align.CENTER,
      });
      const linkRow = new Adw.ActionRow({
        title: _(title),
        activatable: true,
      });
      linkRow.connect('activated', () => {
        Gtk.show_uri(this.get_root(), uri, Gdk.CURRENT_TIME);
      });
      linkRow.add_suffix(image);

      return linkRow;
    }

    _showFileChooser(title, params, acceptBtn, acceptHandler) {
      const dialog = new Gtk.FileChooserDialog({
        title: _(title),
        transient_for: this.get_root(),
        modal: true,
        action: params.action,
      });
      dialog.add_button('_Cancel', Gtk.ResponseType.CANCEL);
      dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);

      dialog.connect('response', (self, response) => {
        if (response === Gtk.ResponseType.ACCEPT) {
          try {
            acceptHandler(dialog.get_file().get_path());
          } catch (e) {
            log(`lu-wotd - Filechooser error: ${e}`);
          }
        }
        dialog.destroy();
      });

      dialog.show();
    }
  });

const GNU_SOFTWARE = '<span size="small">' +
  'This program comes with absolutely no warranty.\n' +
  'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
  'GNU General Public License, version 2 or later</a> for details.' +
  '</span>';
