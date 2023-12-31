
const { Adw, GLib, GObject } = imports.gi;

var DialogWindow = GObject.registerClass({
  Properties: {
    'widget-index': GObject.ParamSpec.int(
      'widget-index',
      'widget-index',
      'widget-index',
      GObject.ParamFlags.READWRITE,
      0,
      GLib.MAXINT32,
      0
    ),
    'element-index': GObject.ParamSpec.int(
      'element-index',
      'element-index',
      'element-index',
      GObject.ParamFlags.READWRITE,
      0,
      GLib.MAXINT32,
      0
    ),
    'widget-title': GObject.ParamSpec.string(
      'widget-title',
      'widget-title',
      'widget-title',
      GObject.ParamFlags.READWRITE,
      ''
    ),
  },
  Signals: {
    'response': { param_types: [GObject.TYPE_INT] },
  },
}, class LuWOTDDialogWindow extends Adw.PreferencesWindow {
  _init(title, parent, params) {
    super._init({
      title,
      transient_for: parent.get_root(),
      modal: true,
      search_enabled: true,
      ...params,
    });

    this.page = new Adw.PreferencesPage();
    this.pageGroup = new Adw.PreferencesGroup();

    this.add(this.page);
    this.page.add(this.pageGroup);
  }
});

