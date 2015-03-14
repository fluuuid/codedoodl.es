(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var App, IS_LIVE, view;

App = require('./App');


/*

WIP - this will ideally change to old format (above) when can figure it out
 */

IS_LIVE = false;

view = IS_LIVE ? {} : window || document;

view.CD = new App(IS_LIVE);

view.CD.init();



},{"./App":2}],2:[function(require,module,exports){
var Analytics, App, AppData, AppView, AuthManager, Facebook, GooglePlus, Locale, MediaQueries, Nav, Router, Share, Templates,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Analytics = require('./utils/Analytics');

AuthManager = require('./utils/AuthManager');

Share = require('./utils/Share');

Facebook = require('./utils/Facebook');

GooglePlus = require('./utils/GooglePlus');

Templates = require('./data/Templates');

Locale = require('./data/Locale');

Router = require('./router/Router');

Nav = require('./router/Nav');

AppData = require('./AppData');

AppView = require('./AppView');

MediaQueries = require('./utils/MediaQueries');

App = (function() {
  App.prototype.LIVE = null;

  App.prototype.BASE_PATH = window.config.hostname;

  App.prototype.localeCode = window.config.localeCode;

  App.prototype.objReady = 0;

  App.prototype._toClean = ['objReady', 'setFlags', 'objectComplete', 'init', 'initObjects', 'initSDKs', 'initApp', 'go', 'cleanup', '_toClean'];

  function App(LIVE) {
    this.LIVE = LIVE;
    this.cleanup = __bind(this.cleanup, this);
    this.go = __bind(this.go, this);
    this.initApp = __bind(this.initApp, this);
    this.initSDKs = __bind(this.initSDKs, this);
    this.initObjects = __bind(this.initObjects, this);
    this.init = __bind(this.init, this);
    this.objectComplete = __bind(this.objectComplete, this);
    this.setFlags = __bind(this.setFlags, this);
    return null;
  }

  App.prototype.setFlags = function() {
    var ua;
    ua = window.navigator.userAgent.toLowerCase();
    MediaQueries.setup();
    this.IS_ANDROID = ua.indexOf('android') > -1;
    this.IS_FIREFOX = ua.indexOf('firefox') > -1;
    this.IS_CHROME_IOS = ua.match('crios') ? true : false;
    return null;
  };

  App.prototype.objectComplete = function() {
    this.objReady++;
    if (this.objReady >= 4) {
      this.initApp();
    }
    return null;
  };

  App.prototype.init = function() {
    this.initObjects();
    return null;
  };

  App.prototype.initObjects = function() {
    this.templates = new Templates("/data/templates" + (this.LIVE ? '.min' : '') + ".xml", this.objectComplete);
    this.locale = new Locale("/data/locales/strings.json", this.objectComplete);
    this.analytics = new Analytics("/data/tracking.json", this.objectComplete);
    this.appData = new AppData(this.objectComplete);
    return null;
  };

  App.prototype.initSDKs = function() {
    Facebook.load();
    GooglePlus.load();
    return null;
  };

  App.prototype.initApp = function() {
    this.setFlags();

    /* Starts application */
    this.appView = new AppView;
    this.router = new Router;
    this.nav = new Nav;
    this.auth = new AuthManager;
    this.share = new Share;
    this.go();
    this.initSDKs();
    return null;
  };

  App.prototype.go = function() {

    /* After everything is loaded, kicks off website */
    this.appView.render();

    /* remove redundant initialisation methods / properties */
    this.cleanup();
    return null;
  };

  App.prototype.cleanup = function() {
    var fn, _i, _len, _ref;
    _ref = this._toClean;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      this[fn] = null;
      delete this[fn];
    }
    return null;
  };

  return App;

})();

module.exports = App;



},{"./AppData":3,"./AppView":4,"./data/Locale":8,"./data/Templates":9,"./router/Nav":13,"./router/Router":14,"./utils/Analytics":15,"./utils/AuthManager":16,"./utils/Facebook":17,"./utils/GooglePlus":18,"./utils/MediaQueries":19,"./utils/Share":21}],3:[function(require,module,exports){
var API, AbstractData, AppData, Requester,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('./data/AbstractData');

Requester = require('./utils/Requester');

API = require('./data/API');

AppData = (function(_super) {
  __extends(AppData, _super);

  AppData.prototype.callback = null;

  function AppData(callback) {
    this.callback = callback;
    this.onStartDataReceived = __bind(this.onStartDataReceived, this);
    this.getStartData = __bind(this.getStartData, this);

    /*
    
    add all data classes here
     */
    AppData.__super__.constructor.call(this);
    this.getStartData();
    return null;
  }


  /*
  get app bootstrap data - embed in HTML or API endpoint
   */

  AppData.prototype.getStartData = function() {
    var r;
    if (API.get('start')) {
      r = Requester.request({
        url: API.get('start'),
        type: 'GET'
      });
      r.done(this.onStartDataReceived);
      r.fail((function(_this) {
        return function() {

          /*
          this is only temporary, while there is no bootstrap data here, normally would handle error / fail
           */
          return typeof _this.callback === "function" ? _this.callback() : void 0;
        };
      })(this));
    } else {
      if (typeof this.callback === "function") {
        this.callback();
      }
    }
    return null;
  };

  AppData.prototype.onStartDataReceived = function(data) {

    /*
    
    bootstrap data received, app ready to go
     */
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };

  return AppData;

})(AbstractData);

module.exports = AppData;



},{"./data/API":6,"./data/AbstractData":7,"./utils/Requester":20}],4:[function(require,module,exports){
var AbstractView, AppView, Footer, Header, ModalManager, Preloader, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./view/AbstractView');

Preloader = require('./view/base/Preloader');

Header = require('./view/base/Header');

Wrapper = require('./view/base/Wrapper');

Footer = require('./view/base/Footer');

ModalManager = require('./view/modals/_ModalManager');

AppView = (function(_super) {
  __extends(AppView, _super);

  AppView.prototype.template = 'main';

  AppView.prototype.$window = null;

  AppView.prototype.$body = null;

  AppView.prototype.wrapper = null;

  AppView.prototype.footer = null;

  AppView.prototype.dims = {
    w: null,
    h: null,
    o: null,
    c: null
  };

  AppView.prototype.events = {
    'click a': 'linkManager'
  };

  AppView.prototype.EVENT_UPDATE_DIMENSIONS = 'EVENT_UPDATE_DIMENSIONS';

  AppView.prototype.MOBILE_WIDTH = 700;

  AppView.prototype.MOBILE = 'mobile';

  AppView.prototype.NON_MOBILE = 'non_mobile';

  function AppView() {
    this.handleExternalLink = __bind(this.handleExternalLink, this);
    this.navigateToUrl = __bind(this.navigateToUrl, this);
    this.linkManager = __bind(this.linkManager, this);
    this.getDims = __bind(this.getDims, this);
    this.onResize = __bind(this.onResize, this);
    this.begin = __bind(this.begin, this);
    this.onAllRendered = __bind(this.onAllRendered, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.render = __bind(this.render, this);
    this.enableTouch = __bind(this.enableTouch, this);
    this.disableTouch = __bind(this.disableTouch, this);
    this.$window = $(window);
    this.$body = $('body').eq(0);
    AppView.__super__.constructor.call(this);
  }

  AppView.prototype.disableTouch = function() {
    this.$window.on('touchmove', this.onTouchMove);
  };

  AppView.prototype.enableTouch = function() {
    this.$window.off('touchmove', this.onTouchMove);
  };

  AppView.prototype.onTouchMove = function(e) {
    e.preventDefault();
  };

  AppView.prototype.render = function() {
    this.bindEvents();
    this.preloader = new Preloader;
    this.preloader.show();
    this.modalManager = new ModalManager;
    this.header = new Header;
    this.wrapper = new Wrapper;
    this.footer = new Footer;
    this.addChild(this.header).addChild(this.wrapper).addChild(this.footer);
    this.onAllRendered();
  };

  AppView.prototype.bindEvents = function() {
    this.on('allRendered', this.onAllRendered);
    this.onResize();
    this.onResize = _.debounce(this.onResize, 300);
    this.$window.on('resize orientationchange', this.onResize);
  };

  AppView.prototype.onAllRendered = function() {
    this.$body.prepend(this.$el);
    this.begin();
  };

  AppView.prototype.begin = function() {
    this.trigger('start');
    this.CD().router.start();
  };

  AppView.prototype.onResize = function() {
    this.getDims();
  };

  AppView.prototype.getDims = function() {
    var h, w;
    w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    this.dims = {
      w: w,
      h: h,
      o: h > w ? 'portrait' : 'landscape',
      c: w <= this.MOBILE_WIDTH ? this.MOBILE : this.NON_MOBILE
    };
    this.trigger(this.EVENT_UPDATE_DIMENSIONS, this.dims);
  };

  AppView.prototype.linkManager = function(e) {
    var href;
    href = $(e.currentTarget).attr('href');
    if (!href) {
      return false;
    }
    this.navigateToUrl(href, e);
  };

  AppView.prototype.navigateToUrl = function(href, e) {
    var route, section;
    if (e == null) {
      e = null;
    }
    route = href.match(this.CD().BASE_PATH) ? href.split(this.CD().BASE_PATH)[1] : href;
    section = route.indexOf('/') === 0 ? route.split('/')[1] : route;
    if (this.CD().nav.getSection(section)) {
      if (e != null) {
        e.preventDefault();
      }
      this.CD().router.navigateTo(route);
    } else {
      this.handleExternalLink(href);
    }
  };

  AppView.prototype.handleExternalLink = function(data) {

    /*
    
    bind tracking events if necessary
     */
  };

  return AppView;

})(AbstractView);

module.exports = AppView;



},{"./view/AbstractView":22,"./view/base/Footer":25,"./view/base/Header":26,"./view/base/Preloader":27,"./view/base/Wrapper":28,"./view/modals/_ModalManager":33}],5:[function(require,module,exports){
var TemplateModel, TemplatesCollection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TemplateModel = require('../../models/core/TemplateModel');

TemplatesCollection = (function(_super) {
  __extends(TemplatesCollection, _super);

  function TemplatesCollection() {
    return TemplatesCollection.__super__.constructor.apply(this, arguments);
  }

  TemplatesCollection.prototype.model = TemplateModel;

  return TemplatesCollection;

})(Backbone.Collection);

module.exports = TemplatesCollection;



},{"../../models/core/TemplateModel":12}],6:[function(require,module,exports){
var API, APIRouteModel;

APIRouteModel = require('../models/core/APIRouteModel');

API = (function() {
  function API() {}

  API.model = new APIRouteModel;

  API.getContants = function() {
    return {

      /* add more if we wanna use in API strings */
      BASE_PATH: API.CD().BASE_PATH
    };
  };

  API.get = function(name, vars) {
    vars = $.extend(true, vars, API.getContants());
    return API.supplantString(API.model.get(name), vars);
  };

  API.supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      return r = vals[b] || (typeof vals[b] === 'number' ? vals[b].toString() : '');
    });
    if (typeof r === "string" || typeof r === "number") {
      return r;
    } else {
      return a;
    }
  };

  API.CD = function() {
    return window.CD;
  };

  return API;

})();

module.exports = API;



},{"../models/core/APIRouteModel":10}],7:[function(require,module,exports){
var AbstractData,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

AbstractData = (function() {
  function AbstractData() {
    this.CD = __bind(this.CD, this);
    _.extend(this, Backbone.Events);
    return null;
  }

  AbstractData.prototype.CD = function() {
    return window.CD;
  };

  return AbstractData;

})();

module.exports = AbstractData;



},{}],8:[function(require,module,exports){
var API, Locale, LocalesModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

LocalesModel = require('../models/core/LocalesModel');

API = require('../data/API');


/*
 * Locale Loader #

Fires back an event when complete
 */

Locale = (function() {
  Locale.prototype.lang = null;

  Locale.prototype.data = null;

  Locale.prototype.callback = null;

  Locale.prototype.backup = null;

  Locale.prototype["default"] = 'en-gb';

  function Locale(data, cb) {
    this.getLocaleImage = __bind(this.getLocaleImage, this);
    this.get = __bind(this.get, this);
    this.loadBackup = __bind(this.loadBackup, this);
    this.onSuccess = __bind(this.onSuccess, this);
    this.getLang = __bind(this.getLang, this);

    /* start Locale Loader, define locale based on browser language */
    this.callback = cb;
    this.backup = data;
    this.lang = this.getLang();
    if (API.get('locale', {
      code: this.lang
    })) {
      $.ajax({
        url: API.get('locale', {
          code: this.lang
        }),
        type: 'GET',
        success: this.onSuccess,
        error: this.loadBackup
      });
    } else {
      this.loadBackup();
    }
    null;
  }

  Locale.prototype.getLang = function() {
    var lang;
    if (window.location.search && window.location.search.match('lang=')) {
      lang = window.location.search.split('lang=')[1].split('&')[0];
    } else if (window.config.localeCode) {
      lang = window.config.localeCode;
    } else {
      lang = this["default"];
    }
    return lang;
  };

  Locale.prototype.onSuccess = function(event) {

    /* Fires back an event once it's complete */
    var d;
    d = null;
    if (event.responseText) {
      d = JSON.parse(event.responseText);
    } else {
      d = event;
    }
    this.data = new LocalesModel(d);
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };

  Locale.prototype.loadBackup = function() {

    /* When API not available, tries to load the static .txt locale */
    $.ajax({
      url: this.backup,
      dataType: 'json',
      complete: this.onSuccess,
      error: (function(_this) {
        return function() {
          return console.log('error on loading backup');
        };
      })(this)
    });
    return null;
  };

  Locale.prototype.get = function(id) {

    /* get String from locale
    + id : string id of the Localised String
     */
    return this.data.getString(id);
  };

  Locale.prototype.getLocaleImage = function(url) {
    return window.config.CDN + "/images/locale/" + window.config.localeCode + "/" + url;
  };

  return Locale;

})();

module.exports = Locale;



},{"../data/API":6,"../models/core/LocalesModel":11}],9:[function(require,module,exports){
var TemplateModel, Templates, TemplatesCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

TemplateModel = require('../models/core/TemplateModel');

TemplatesCollection = require('../collections/core/TemplatesCollection');

Templates = (function() {
  Templates.prototype.templates = null;

  Templates.prototype.cb = null;

  function Templates(templates, callback) {
    this.get = __bind(this.get, this);
    this.parseXML = __bind(this.parseXML, this);
    this.cb = callback;
    $.ajax({
      url: templates,
      success: this.parseXML
    });
    null;
  }

  Templates.prototype.parseXML = function(data) {
    var temp;
    temp = [];
    $(data).find('template').each(function(key, value) {
      var $value;
      $value = $(value);
      return temp.push(new TemplateModel({
        id: $value.attr('id').toString(),
        text: $.trim($value.text())
      }));
    });
    this.templates = new TemplatesCollection(temp);
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Templates.prototype.get = function(id) {
    var t;
    t = this.templates.where({
      id: id
    });
    t = t[0].get('text');
    return $.trim(t);
  };

  return Templates;

})();

module.exports = Templates;



},{"../collections/core/TemplatesCollection":5,"../models/core/TemplateModel":12}],10:[function(require,module,exports){
var APIRouteModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

APIRouteModel = (function(_super) {
  __extends(APIRouteModel, _super);

  function APIRouteModel() {
    return APIRouteModel.__super__.constructor.apply(this, arguments);
  }

  APIRouteModel.prototype.defaults = {
    start: "",
    locale: "",
    user: {
      login: "{{ BASE_PATH }}/api/user/login",
      register: "{{ BASE_PATH }}/api/user/register",
      password: "{{ BASE_PATH }}/api/user/password",
      update: "{{ BASE_PATH }}/api/user/update",
      logout: "{{ BASE_PATH }}/api/user/logout",
      remove: "{{ BASE_PATH }}/api/user/remove"
    }
  };

  return APIRouteModel;

})(Backbone.DeepModel);

module.exports = APIRouteModel;



},{}],11:[function(require,module,exports){
var LocalesModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LocalesModel = (function(_super) {
  __extends(LocalesModel, _super);

  function LocalesModel() {
    this.getString = __bind(this.getString, this);
    this.get_language = __bind(this.get_language, this);
    return LocalesModel.__super__.constructor.apply(this, arguments);
  }

  LocalesModel.prototype.defaults = {
    code: null,
    language: null,
    strings: null
  };

  LocalesModel.prototype.get_language = function() {
    return this.get('language');
  };

  LocalesModel.prototype.getString = function(id) {
    var a, e, k, v, _ref, _ref1;
    _ref = this.get('strings');
    for (k in _ref) {
      v = _ref[k];
      _ref1 = v['strings'];
      for (a in _ref1) {
        e = _ref1[a];
        if (a === id) {
          return e;
        }
      }
    }
    console.warn("Locales -> not found string: " + id);
    return null;
  };

  return LocalesModel;

})(Backbone.Model);

module.exports = LocalesModel;



},{}],12:[function(require,module,exports){
var TemplateModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TemplateModel = (function(_super) {
  __extends(TemplateModel, _super);

  function TemplateModel() {
    return TemplateModel.__super__.constructor.apply(this, arguments);
  }

  TemplateModel.prototype.defaults = {
    id: "",
    text: ""
  };

  return TemplateModel;

})(Backbone.Model);

module.exports = TemplateModel;



},{}],13:[function(require,module,exports){
var AbstractView, Nav, Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../view/AbstractView');

Router = require('./Router');

Nav = (function(_super) {
  __extends(Nav, _super);

  Nav.EVENT_CHANGE_VIEW = 'EVENT_CHANGE_VIEW';

  Nav.EVENT_CHANGE_SUB_VIEW = 'EVENT_CHANGE_SUB_VIEW';

  Nav.prototype.sections = {
    HOME: '',
    ABOUT: 'about',
    CONTRIBUTE: 'contribute',
    DOODLES: '_'
  };

  Nav.prototype.current = {
    area: null,
    sub: null
  };

  Nav.prototype.previous = {
    area: null,
    sub: null
  };

  function Nav() {
    this.setPageTitle = __bind(this.setPageTitle, this);
    this.changeView = __bind(this.changeView, this);
    this.getSection = __bind(this.getSection, this);
    this.CD().router.on(Router.EVENT_HASH_CHANGED, this.changeView);
    return false;
  }

  Nav.prototype.getSection = function(section) {
    var sectionName, uri, _ref;
    if (section === '') {
      return true;
    }
    _ref = this.sections;
    for (sectionName in _ref) {
      uri = _ref[sectionName];
      if (uri === section) {
        return sectionName;
      }
    }
    return false;
  };

  Nav.prototype.changeView = function(area, sub, params) {
    this.previous = this.current;
    this.current = {
      area: area,
      sub: sub
    };
    if (this.previous.area && this.previous.area === this.current.area) {
      this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    } else {
      this.trigger(Nav.EVENT_CHANGE_VIEW, this.previous, this.current);
      this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    }
    if (this.CD().appView.modalManager.isOpen()) {
      this.CD().appView.modalManager.hideOpenModal();
    }
    this.setPageTitle(area, sub);
    return null;
  };

  Nav.prototype.setPageTitle = function(area, sub) {
    var title;
    title = "PAGE TITLE HERE - LOCALISE BASED ON URL";
    if (window.document.title !== title) {
      window.document.title = title;
    }
    return null;
  };

  return Nav;

})(AbstractView);

module.exports = Nav;



},{"../view/AbstractView":22,"./Router":14}],14:[function(require,module,exports){
var Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    this.CD = __bind(this.CD, this);
    this.navigateTo = __bind(this.navigateTo, this);
    this.hashChanged = __bind(this.hashChanged, this);
    this.start = __bind(this.start, this);
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.EVENT_HASH_CHANGED = 'EVENT_HASH_CHANGED';

  Router.prototype.FIRST_ROUTE = true;

  Router.prototype.routes = {
    '(/)(:area)(/:sub)(/)': 'hashChanged',
    '*actions': 'navigateTo'
  };

  Router.prototype.area = null;

  Router.prototype.sub = null;

  Router.prototype.params = null;

  Router.prototype.start = function() {
    Backbone.history.start({
      pushState: true,
      root: '/'
    });
    return null;
  };

  Router.prototype.hashChanged = function(area, sub) {
    this.area = area != null ? area : null;
    this.sub = sub != null ? sub : null;
    console.log(">> EVENT_HASH_CHANGED @area = " + this.area + ", @sub = " + this.sub + " <<");
    if (this.FIRST_ROUTE) {
      this.FIRST_ROUTE = false;
    }
    if (!this.area) {
      this.area = this.CD().nav.sections.HOME;
    }
    this.trigger(Router.EVENT_HASH_CHANGED, this.area, this.sub, this.params);
    return null;
  };

  Router.prototype.navigateTo = function(where, trigger, replace, params) {
    if (where == null) {
      where = '';
    }
    if (trigger == null) {
      trigger = true;
    }
    if (replace == null) {
      replace = false;
    }
    this.params = params;
    if (where.charAt(0) !== "/") {
      where = "/" + where;
    }
    if (where.charAt(where.length - 1) !== "/") {
      where = "" + where + "/";
    }
    if (!trigger) {
      this.trigger(Router.EVENT_HASH_CHANGED, where, null, this.params);
      return;
    }
    this.navigate(where, {
      trigger: true,
      replace: replace
    });
    return null;
  };

  Router.prototype.CD = function() {
    return window.CD;
  };

  return Router;

})(Backbone.Router);

module.exports = Router;



},{}],15:[function(require,module,exports){

/*
Analytics wrapper
 */
var Analytics,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Analytics = (function() {
  Analytics.prototype.tags = null;

  Analytics.prototype.started = false;

  Analytics.prototype.attempts = 0;

  Analytics.prototype.allowedAttempts = 5;

  function Analytics(tags, callback) {
    this.callback = callback;
    this.track = __bind(this.track, this);
    this.onTagsReceived = __bind(this.onTagsReceived, this);
    $.getJSON(tags, this.onTagsReceived);
    return null;
  }

  Analytics.prototype.onTagsReceived = function(data) {
    this.tags = data;
    this.started = true;
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };


  /*
  @param string id of the tracking tag to be pushed on Analytics
   */

  Analytics.prototype.track = function(param) {
    var arg, args, v, _i, _len;
    if (!this.started) {
      return;
    }
    if (param) {
      v = this.tags[param];
      if (v) {
        args = ['send', 'event'];
        for (_i = 0, _len = v.length; _i < _len; _i++) {
          arg = v[_i];
          args.push(arg);
        }
        if (window.ga) {
          ga.apply(null, args);
        } else if (this.attempts >= this.allowedAttempts) {
          this.started = false;
        } else {
          setTimeout((function(_this) {
            return function() {
              _this.track(param);
              return _this.attempts++;
            };
          })(this), 2000);
        }
      }
    }
    return null;
  };

  return Analytics;

})();

module.exports = Analytics;



},{}],16:[function(require,module,exports){
var AbstractData, AuthManager, Facebook, GooglePlus,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');

Facebook = require('../utils/Facebook');

GooglePlus = require('../utils/GooglePlus');

AuthManager = (function(_super) {
  __extends(AuthManager, _super);

  AuthManager.prototype.userData = null;

  AuthManager.prototype.process = false;

  AuthManager.prototype.processTimer = null;

  AuthManager.prototype.processWait = 5000;

  function AuthManager() {
    this.hideLoader = __bind(this.hideLoader, this);
    this.showLoader = __bind(this.showLoader, this);
    this.authCallback = __bind(this.authCallback, this);
    this.authFail = __bind(this.authFail, this);
    this.authSuccess = __bind(this.authSuccess, this);
    this.login = __bind(this.login, this);
    this.userData = this.CD().appData.USER;
    AuthManager.__super__.constructor.call(this);
    return null;
  }

  AuthManager.prototype.login = function(service, cb) {
    var $dataDfd;
    if (cb == null) {
      cb = null;
    }
    if (this.process) {
      return;
    }
    this.showLoader();
    this.process = true;
    $dataDfd = $.Deferred();
    switch (service) {
      case 'google':
        GooglePlus.login($dataDfd);
        break;
      case 'facebook':
        Facebook.login($dataDfd);
    }
    $dataDfd.done((function(_this) {
      return function(res) {
        return _this.authSuccess(service, res);
      };
    })(this));
    $dataDfd.fail((function(_this) {
      return function(res) {
        return _this.authFail(service, res);
      };
    })(this));
    $dataDfd.always((function(_this) {
      return function() {
        return _this.authCallback(cb);
      };
    })(this));

    /*
    		Unfortunately no callback is fired if user manually closes G+ login modal,
    		so this is to allow them to close window and then subsequently try to log in again...
     */
    this.processTimer = setTimeout(this.authCallback, this.processWait);
    return $dataDfd;
  };

  AuthManager.prototype.authSuccess = function(service, data) {
    return null;
  };

  AuthManager.prototype.authFail = function(service, data) {
    return null;
  };

  AuthManager.prototype.authCallback = function(cb) {
    if (cb == null) {
      cb = null;
    }
    if (!this.process) {
      return;
    }
    clearTimeout(this.processTimer);
    this.hideLoader();
    this.process = false;
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };


  /*
  	show / hide some UI indicator that we are waiting for social network to respond
   */

  AuthManager.prototype.showLoader = function() {
    return null;
  };

  AuthManager.prototype.hideLoader = function() {
    return null;
  };

  return AuthManager;

})(AbstractData);

module.exports = AuthManager;



},{"../data/AbstractData":7,"../utils/Facebook":17,"../utils/GooglePlus":18}],17:[function(require,module,exports){
var AbstractData, Facebook,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');


/*

Facebook SDK wrapper - load asynchronously, some helper methods
 */

Facebook = (function(_super) {
  __extends(Facebook, _super);

  function Facebook() {
    return Facebook.__super__.constructor.apply(this, arguments);
  }

  Facebook.url = '//connect.facebook.net/en_US/all.js';

  Facebook.permissions = 'email';

  Facebook.$dataDfd = null;

  Facebook.loaded = false;

  Facebook.load = function() {

    /*
    		TO DO
    		include script loader with callback to :init
     */
    return null;
  };

  Facebook.init = function() {
    Facebook.loaded = true;
    FB.init({
      appId: window.config.fb_app_id,
      status: false,
      xfbml: false
    });
    return null;
  };

  Facebook.login = function($dataDfd) {
    Facebook.$dataDfd = $dataDfd;
    if (!Facebook.loaded) {
      return Facebook.$dataDfd.reject('SDK not loaded');
    }
    FB.login(function(res) {
      if (res['status'] === 'connected') {
        return Facebook.getUserData(res['authResponse']['accessToken']);
      } else {
        return Facebook.$dataDfd.reject('no way jose');
      }
    }, {
      scope: Facebook.permissions
    });
    return null;
  };

  Facebook.getUserData = function(token) {
    var $meDfd, $picDfd, userData;
    userData = {};
    userData.access_token = token;
    $meDfd = $.Deferred();
    $picDfd = $.Deferred();
    FB.api('/me', function(res) {
      userData.full_name = res.name;
      userData.social_id = res.id;
      userData.email = res.email || false;
      return $meDfd.resolve();
    });
    FB.api('/me/picture', {
      'width': '200'
    }, function(res) {
      userData.profile_pic = res.data.url;
      return $picDfd.resolve();
    });
    $.when($meDfd, $picDfd).done(function() {
      return Facebook.$dataDfd.resolve(userData);
    });
    return null;
  };

  Facebook.share = function(opts, cb) {
    FB.ui({
      method: opts.method || 'feed',
      name: opts.name || '',
      link: opts.link || '',
      picture: opts.picture || '',
      caption: opts.caption || '',
      description: opts.description || ''
    }, function(response) {
      return typeof cb === "function" ? cb(response) : void 0;
    });
    return null;
  };

  return Facebook;

})(AbstractData);

module.exports = Facebook;



},{"../data/AbstractData":7}],18:[function(require,module,exports){
var AbstractData, GooglePlus,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');


/*

Google+ SDK wrapper - load asynchronously, some helper methods
 */

GooglePlus = (function(_super) {
  __extends(GooglePlus, _super);

  function GooglePlus() {
    return GooglePlus.__super__.constructor.apply(this, arguments);
  }

  GooglePlus.url = 'https://apis.google.com/js/client:plusone.js';

  GooglePlus.params = {
    'clientid': null,
    'callback': null,
    'scope': 'https://www.googleapis.com/auth/userinfo.email',
    'cookiepolicy': 'none'
  };

  GooglePlus.$dataDfd = null;

  GooglePlus.loaded = false;

  GooglePlus.load = function() {

    /*
    		TO DO
    		include script loader with callback to :init
     */
    return null;
  };

  GooglePlus.init = function() {
    GooglePlus.loaded = true;
    GooglePlus.params['clientid'] = window.config.gp_app_id;
    GooglePlus.params['callback'] = GooglePlus.loginCallback;
    return null;
  };

  GooglePlus.login = function($dataDfd) {
    GooglePlus.$dataDfd = $dataDfd;
    if (GooglePlus.loaded) {
      gapi.auth.signIn(GooglePlus.params);
    } else {
      GooglePlus.$dataDfd.reject('SDK not loaded');
    }
    return null;
  };

  GooglePlus.loginCallback = function(res) {
    if (res['status']['signed_in']) {
      GooglePlus.getUserData(res['access_token']);
    } else if (res['error']['access_denied']) {
      GooglePlus.$dataDfd.reject('no way jose');
    }
    return null;
  };

  GooglePlus.getUserData = function(token) {
    gapi.client.load('plus', 'v1', function() {
      var request;
      request = gapi.client.plus.people.get({
        'userId': 'me'
      });
      return request.execute(function(res) {
        var userData;
        userData = {
          access_token: token,
          full_name: res.displayName,
          social_id: res.id,
          email: res.emails[0] ? res.emails[0].value : false,
          profile_pic: res.image.url
        };
        return GooglePlus.$dataDfd.resolve(userData);
      });
    });
    return null;
  };

  return GooglePlus;

})(AbstractData);

module.exports = GooglePlus;



},{"../data/AbstractData":7}],19:[function(require,module,exports){
var MediaQueries;

MediaQueries = (function() {
  function MediaQueries() {}

  MediaQueries.SMALL = "small";

  MediaQueries.IPAD = "ipad";

  MediaQueries.MEDIUM = "medium";

  MediaQueries.LARGE = "large";

  MediaQueries.EXTRA_LARGE = "extra-large";

  MediaQueries.setup = function() {
    MediaQueries.SMALL_BREAKPOINT = {
      name: "Small",
      breakpoints: [MediaQueries.SMALL]
    };
    MediaQueries.MEDIUM_BREAKPOINT = {
      name: "Medium",
      breakpoints: [MediaQueries.MEDIUM]
    };
    MediaQueries.LARGE_BREAKPOINT = {
      name: "Large",
      breakpoints: [MediaQueries.IPAD, MediaQueries.LARGE, MediaQueries.EXTRA_LARGE]
    };
    MediaQueries.BREAKPOINTS = [MediaQueries.SMALL_BREAKPOINT, MediaQueries.MEDIUM_BREAKPOINT, MediaQueries.LARGE_BREAKPOINT];
  };

  MediaQueries.getDeviceState = function() {
    return window.getComputedStyle(document.body, "after").getPropertyValue("content");
  };

  MediaQueries.getBreakpoint = function() {
    var i, state, _i, _ref;
    state = MediaQueries.getDeviceState();
    for (i = _i = 0, _ref = MediaQueries.BREAKPOINTS.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (MediaQueries.BREAKPOINTS[i].breakpoints.indexOf(state) > -1) {
        return MediaQueries.BREAKPOINTS[i].name;
      }
    }
    return "";
  };

  MediaQueries.isBreakpoint = function(breakpoint) {
    var i, _i, _ref;
    for (i = _i = 0, _ref = breakpoint.breakpoints.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (breakpoint.breakpoints[i] === MediaQueries.getDeviceState()) {
        return true;
      }
    }
    return false;
  };

  return MediaQueries;

})();

module.exports = MediaQueries;



},{}],20:[function(require,module,exports){

/*
 * Requester #

Wrapper for `$.ajax` calls
 */
var Requester;

Requester = (function() {
  function Requester() {}

  Requester.requests = [];

  Requester.request = function(data) {

    /*
    `data = {`<br>
    `  url         : String`<br>
    `  type        : "POST/GET/PUT"`<br>
    `  data        : Object`<br>
    `  dataType    : jQuery dataType`<br>
    `  contentType : String`<br>
    `}`
     */
    var r;
    r = $.ajax({
      url: data.url,
      type: data.type ? data.type : "POST",
      data: data.data ? data.data : null,
      dataType: data.dataType ? data.dataType : "json",
      contentType: data.contentType ? data.contentType : "application/x-www-form-urlencoded; charset=UTF-8",
      processData: data.processData !== null && data.processData !== void 0 ? data.processData : true
    });
    r.done(data.done);
    r.fail(data.fail);
    return r;
  };

  Requester.addImage = function(data, done, fail) {

    /*
    ** Usage: <br>
    `data = canvass.toDataURL("image/jpeg").slice("data:image/jpeg;base64,".length)`<br>
    `Requester.addImage data, "zoetrope", @done, @fail`
     */
    Requester.request({
      url: '/api/images/',
      type: 'POST',
      data: {
        image_base64: encodeURI(data)
      },
      done: done,
      fail: fail
    });
    return null;
  };

  Requester.deleteImage = function(id, done, fail) {
    Requester.request({
      url: '/api/images/' + id,
      type: 'DELETE',
      done: done,
      fail: fail
    });
    return null;
  };

  return Requester;

})();

module.exports = Requester;



},{}],21:[function(require,module,exports){

/*
Sharing class for non-SDK loaded social networks.
If SDK is loaded, and provides share methods, then use that class instead, eg. `Facebook.share` instead of `Share.facebook`
 */
var Share,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Share = (function() {
  Share.prototype.url = null;

  function Share() {
    this.CD = __bind(this.CD, this);
    this.weibo = __bind(this.weibo, this);
    this.renren = __bind(this.renren, this);
    this.twitter = __bind(this.twitter, this);
    this.facebook = __bind(this.facebook, this);
    this.tumblr = __bind(this.tumblr, this);
    this.pinterest = __bind(this.pinterest, this);
    this.plus = __bind(this.plus, this);
    this.openWin = __bind(this.openWin, this);
    this.url = this.CD().BASE_PATH;
    return null;
  }

  Share.prototype.openWin = function(url, w, h) {
    var left, top;
    left = (screen.availWidth - w) >> 1;
    top = (screen.availHeight - h) >> 1;
    window.open(url, '', 'top=' + top + ',left=' + left + ',width=' + w + ',height=' + h + ',location=no,menubar=no');
    return null;
  };

  Share.prototype.plus = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("https://plus.google.com/share?url=" + url, 650, 385);
    return null;
  };

  Share.prototype.pinterest = function(url, media, descr) {
    url = encodeURIComponent(url || this.url);
    media = encodeURIComponent(media);
    descr = encodeURIComponent(descr);
    this.openWin("http://www.pinterest.com/pin/create/button/?url=" + url + "&media=" + media + "&description=" + descr, 735, 310);
    return null;
  };

  Share.prototype.tumblr = function(url, media, descr) {
    url = encodeURIComponent(url || this.url);
    media = encodeURIComponent(media);
    descr = encodeURIComponent(descr);
    this.openWin("http://www.tumblr.com/share/photo?source=" + media + "&caption=" + descr + "&click_thru=" + url, 450, 430);
    return null;
  };

  Share.prototype.facebook = function(url, copy) {
    var decsr;
    if (copy == null) {
      copy = '';
    }
    url = encodeURIComponent(url || this.url);
    decsr = encodeURIComponent(copy);
    this.openWin("http://www.facebook.com/share.php?u=" + url + "&t=" + decsr, 600, 300);
    return null;
  };

  Share.prototype.twitter = function(url, copy) {
    var descr;
    if (copy == null) {
      copy = '';
    }
    url = encodeURIComponent(url || this.url);
    if (copy === '') {
      copy = this.CD().locale.get('seo_twitter_card_description');
    }
    descr = encodeURIComponent(copy);
    this.openWin("http://twitter.com/intent/tweet/?text=" + descr + "&url=" + url, 600, 300);
    return null;
  };

  Share.prototype.renren = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("http://share.renren.com/share/buttonshare.do?link=" + url, 600, 300);
    return null;
  };

  Share.prototype.weibo = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("http://service.weibo.com/share/share.php?url=" + url + "&language=zh_cn", 600, 300);
    return null;
  };

  Share.prototype.CD = function() {
    return window.CD;
  };

  return Share;

})();

module.exports = Share;



},{}],22:[function(require,module,exports){
var AbstractView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = (function(_super) {
  __extends(AbstractView, _super);

  function AbstractView() {
    this.CD = __bind(this.CD, this);
    this.dispose = __bind(this.dispose, this);
    this.callChildrenAndSelf = __bind(this.callChildrenAndSelf, this);
    this.callChildren = __bind(this.callChildren, this);
    this.triggerChildren = __bind(this.triggerChildren, this);
    this.removeAllChildren = __bind(this.removeAllChildren, this);
    this.muteAll = __bind(this.muteAll, this);
    this.unMuteAll = __bind(this.unMuteAll, this);
    this.CSSTranslate = __bind(this.CSSTranslate, this);
    this.mouseEnabled = __bind(this.mouseEnabled, this);
    this.onResize = __bind(this.onResize, this);
    this.remove = __bind(this.remove, this);
    this.replace = __bind(this.replace, this);
    this.addChild = __bind(this.addChild, this);
    this.render = __bind(this.render, this);
    this.update = __bind(this.update, this);
    this.init = __bind(this.init, this);
    return AbstractView.__super__.constructor.apply(this, arguments);
  }

  AbstractView.prototype.el = null;

  AbstractView.prototype.id = null;

  AbstractView.prototype.children = null;

  AbstractView.prototype.template = null;

  AbstractView.prototype.templateVars = null;

  AbstractView.prototype.initialize = function() {
    var tmpHTML;
    this.children = [];
    if (this.template) {
      tmpHTML = _.template(this.CD().templates.get(this.template));
      this.setElement(tmpHTML(this.templateVars));
    }
    if (this.id) {
      this.$el.attr('id', this.id);
    }
    if (this.className) {
      this.$el.addClass(this.className);
    }
    this.init();
    this.paused = false;
    return null;
  };

  AbstractView.prototype.init = function() {
    return null;
  };

  AbstractView.prototype.update = function() {
    return null;
  };

  AbstractView.prototype.render = function() {
    return null;
  };

  AbstractView.prototype.addChild = function(child, prepend) {
    var c, target;
    if (prepend == null) {
      prepend = false;
    }
    if (child.el) {
      this.children.push(child);
    }
    target = this.addToSelector ? this.$el.find(this.addToSelector).eq(0) : this.$el;
    c = child.el ? child.$el : child;
    if (!prepend) {
      target.append(c);
    } else {
      target.prepend(c);
    }
    return this;
  };

  AbstractView.prototype.replace = function(dom, child) {
    var c;
    if (child.el) {
      this.children.push(child);
    }
    c = child.el ? child.$el : child;
    this.$el.children(dom).replaceWith(c);
    return null;
  };

  AbstractView.prototype.remove = function(child) {
    var c;
    if (child == null) {
      return;
    }
    c = child.el ? child.$el : $(child);
    if (c && child.dispose) {
      child.dispose();
    }
    if (c && this.children.indexOf(child) !== -1) {
      this.children.splice(this.children.indexOf(child), 1);
    }
    c.remove();
    return null;
  };

  AbstractView.prototype.onResize = function(event) {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (child.onResize) {
        child.onResize();
      }
    }
    return null;
  };

  AbstractView.prototype.mouseEnabled = function(enabled) {
    this.$el.css({
      "pointer-events": enabled ? "auto" : "none"
    });
    return null;
  };

  AbstractView.prototype.CSSTranslate = function(x, y, value, scale) {
    var str;
    if (value == null) {
      value = '%';
    }
    if (Modernizr.csstransforms3d) {
      str = "translate3d(" + (x + value) + ", " + (y + value) + ", 0)";
    } else {
      str = "translate(" + (x + value) + ", " + (y + value) + ")";
    }
    if (scale) {
      str = "" + str + " scale(" + scale + ")";
    }
    return str;
  };

  AbstractView.prototype.unMuteAll = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (typeof child.unMute === "function") {
        child.unMute();
      }
      if (child.children.length) {
        child.unMuteAll();
      }
    }
    return null;
  };

  AbstractView.prototype.muteAll = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (typeof child.mute === "function") {
        child.mute();
      }
      if (child.children.length) {
        child.muteAll();
      }
    }
    return null;
  };

  AbstractView.prototype.removeAllChildren = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      this.remove(child);
    }
    return null;
  };

  AbstractView.prototype.triggerChildren = function(msg, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      child.trigger(msg);
      if (child.children.length) {
        this.triggerChildren(msg, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.callChildren = function(method, params, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      if (typeof child[method] === "function") {
        child[method](params);
      }
      if (child.children.length) {
        this.callChildren(method, params, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.callChildrenAndSelf = function(method, params, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    if (typeof this[method] === "function") {
      this[method](params);
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      if (typeof child[method] === "function") {
        child[method](params);
      }
      if (child.children.length) {
        this.callChildren(method, params, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      r = vals[b];
      if (typeof r === "string" || typeof r === "number") {
        return r;
      } else {
        return a;
      }
    });
  };

  AbstractView.prototype.dispose = function() {

    /*
    		override on per view basis - unbind event handlers etc
     */
    return null;
  };

  AbstractView.prototype.CD = function() {
    return window.CD;
  };

  return AbstractView;

})(Backbone.View);

module.exports = AbstractView;



},{}],23:[function(require,module,exports){
var AbstractView, AbstractViewPage,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./AbstractView');

AbstractViewPage = (function(_super) {
  __extends(AbstractViewPage, _super);

  function AbstractViewPage() {
    this.setListeners = __bind(this.setListeners, this);
    this.dispose = __bind(this.dispose, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    return AbstractViewPage.__super__.constructor.apply(this, arguments);
  }

  AbstractViewPage.prototype._shown = false;

  AbstractViewPage.prototype._listening = false;

  AbstractViewPage.prototype.show = function(cb) {
    if (!!this._shown) {
      return;
    }
    this._shown = true;

    /*
    		CHANGE HERE - 'page' views are always in DOM - to save having to re-initialise gmap events (PITA). No longer require :dispose method
     */
    this.CD().appView.wrapper.addChild(this);
    this.callChildrenAndSelf('setListeners', 'on');

    /* replace with some proper transition if we can */
    this.$el.css({
      'visibility': 'visible'
    });
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  AbstractViewPage.prototype.hide = function(cb) {
    if (!this._shown) {
      return;
    }
    this._shown = false;

    /*
    		CHANGE HERE - 'page' views are always in DOM - to save having to re-initialise gmap events (PITA). No longer require :dispose method
     */
    this.CD().appView.wrapper.remove(this);

    /* replace with some proper transition if we can */
    this.$el.css({
      'visibility': 'hidden'
    });
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  AbstractViewPage.prototype.dispose = function() {
    this.callChildrenAndSelf('setListeners', 'off');
    return null;
  };

  AbstractViewPage.prototype.setListeners = function(setting) {
    if (setting === this._listening) {
      return;
    }
    this._listening = setting;
    return null;
  };

  return AbstractViewPage;

})(AbstractView);

module.exports = AbstractViewPage;



},{"./AbstractView":22}],24:[function(require,module,exports){
var AboutPageView, AbstractViewPage,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

AboutPageView = (function(_super) {
  __extends(AboutPageView, _super);

  AboutPageView.prototype.template = 'page-about';

  function AboutPageView() {
    this.templateVars = {
      desc: this.CD().locale.get("about_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    AboutPageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return AboutPageView;

})(AbstractViewPage);

module.exports = AboutPageView;



},{"../AbstractViewPage":23}],25:[function(require,module,exports){
var AbstractView, Footer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Footer = (function(_super) {
  __extends(Footer, _super);

  Footer.prototype.template = 'site-footer';

  function Footer() {
    this.templateVars = {};
    Footer.__super__.constructor.call(this);
    return null;
  }

  return Footer;

})(AbstractView);

module.exports = Footer;



},{"../AbstractView":22}],26:[function(require,module,exports){
var AbstractView, Header, Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Router = require('../../router/Router');

Header = (function(_super) {
  __extends(Header, _super);

  Header.prototype.template = 'site-header';

  function Header() {
    this.onHashChange = __bind(this.onHashChange, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.templateVars = {
      home: {
        label: this.CD().locale.get('header_logo_label'),
        url: this.CD().BASE_PATH + '/' + this.CD().nav.sections.HOME
      },
      about: {
        label: this.CD().locale.get('header_about_label'),
        url: this.CD().BASE_PATH + '/' + this.CD().nav.sections.ABOUT
      },
      contribute: {
        label: this.CD().locale.get('header_contribute_label'),
        url: this.CD().BASE_PATH + '/' + this.CD().nav.sections.CONTRIBUTE
      },
      close_label: this.CD().locale.get('header_close_label'),
      info_label: this.CD().locale.get('header_info_label')
    };
    Header.__super__.constructor.call(this);
    this.bindEvents();
    return null;
  }

  Header.prototype.bindEvents = function() {
    this.CD().router.on(Router.EVENT_HASH_CHANGED, this.onHashChange);
    return null;
  };

  Header.prototype.onHashChange = function(where) {
    where = where || 'home';
    this.$el.attr('data-section', where);
    return null;
  };

  return Header;

})(AbstractView);

module.exports = Header;



},{"../../router/Router":14,"../AbstractView":22}],27:[function(require,module,exports){
var AbstractView, Preloader,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Preloader = (function(_super) {
  __extends(Preloader, _super);

  Preloader.prototype.cb = null;

  Preloader.prototype.TRANSITION_TIME = 0.5;

  Preloader.prototype.MIN_WRONG_CHARS = 0;

  Preloader.prototype.MAX_WRONG_CHARS = 4;

  Preloader.prototype.MIN_CHAR_IN_DELAY = 30;

  Preloader.prototype.MAX_CHAR_IN_DELAY = 100;

  Preloader.prototype.MIN_CHAR_OUT_DELAY = 30;

  Preloader.prototype.MAX_CHAR_OUT_DELAY = 100;

  Preloader.prototype.CHARS = 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('');

  function Preloader() {
    this.animateCharsOut = __bind(this.animateCharsOut, this);
    this.animateCharsInDone = __bind(this.animateCharsInDone, this);
    this._animateWrongCharsIn = __bind(this._animateWrongCharsIn, this);
    this._animateCharIn = __bind(this._animateCharIn, this);
    this.animateCharsIn = __bind(this.animateCharsIn, this);
    this._getRandomChar = __bind(this._getRandomChar, this);
    this._getRandomWrongChars = __bind(this._getRandomWrongChars, this);
    this.setupChars = __bind(this.setupChars, this);
    this.onHideComplete = __bind(this.onHideComplete, this);
    this.hide = __bind(this.hide, this);
    this.onShowComplete = __bind(this.onShowComplete, this);
    this.show = __bind(this.show, this);
    this.init = __bind(this.init, this);
    this.setElement($('#preloader'));
    Preloader.__super__.constructor.call(this);
    return null;
  }

  Preloader.prototype.init = function() {
    this.setupChars();
    return null;
  };

  Preloader.prototype.show = function(cb) {
    this.cb = cb;
    console.log("show : (@cb) =>");
    this.$el.addClass('show-preloader');
    this.animateCharsIn(this.hide);
    return null;
  };

  Preloader.prototype.onShowComplete = function() {
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.hide = function(cb) {
    this.cb = cb;
    this.animateCharsOut(this.onHideComplete);
    return null;
  };

  Preloader.prototype.onHideComplete = function() {
    this.$el.removeClass('show-preloader');
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.setupChars = function() {
    this.chars = [];
    this.$el.find('[data-codetext-char]').each((function(_this) {
      return function(i, el) {
        var $el;
        $el = $(el);
        return _this.chars.push({
          $el: $el,
          rightChar: $el.attr('data-codetext-char'),
          wrongChars: _this._getRandomWrongChars()
        });
      };
    })(this));
    return null;
  };

  Preloader.prototype._getRandomWrongChars = function() {
    var charCount, chars, i, _i;
    chars = [];
    charCount = _.random(this.MIN_WRONG_CHARS, this.MAX_WRONG_CHARS);
    for (i = _i = 0; 0 <= charCount ? _i < charCount : _i > charCount; i = 0 <= charCount ? ++_i : --_i) {
      chars.push({
        char: this._getRandomChar(),
        inDelay: _.random(this.MIN_CHAR_IN_DELAY, this.MAX_CHAR_IN_DELAY),
        outDelay: _.random(this.MIN_CHAR_OUT_DELAY, this.MAX_CHAR_OUT_DELAY)
      });
    }
    return chars;
  };

  Preloader.prototype._getRandomChar = function() {
    var char;
    char = this.CHARS[_.random(0, this.CHARS.length - 1)];
    return char;
  };

  Preloader.prototype.animateCharsIn = function(cb) {
    var activeChar;
    activeChar = 0;
    this._animateCharIn(activeChar, cb);
    return null;
  };

  Preloader.prototype._animateCharIn = function(idx, cb) {
    var char;
    char = this.chars[idx];
    this._animateWrongCharsIn(char, (function(_this) {
      return function() {
        if (idx === _this.chars.length - 1) {
          return _this.animateCharsInDone(cb);
        } else {
          return _this._animateCharIn(idx + 1, cb);
        }
      };
    })(this));
    return null;
  };

  Preloader.prototype._animateWrongCharsIn = function(char, cb) {
    var wrongChar;
    if (char.wrongChars.length) {
      wrongChar = char.wrongChars.shift();
      setTimeout((function(_this) {
        return function() {
          char.$el.html(wrongChar.char);
          return setTimeout(function() {
            return _this._animateWrongCharsIn(char, cb);
          }, wrongChar.outDelay);
        };
      })(this), wrongChar.inDelay);
    } else {
      char.$el.html(char.rightChar);
      cb();
    }
    return null;
  };

  Preloader.prototype.animateCharsInDone = function(cb) {
    console.log("animateCharsInDone : =>");
    cb();
    return null;
  };

  Preloader.prototype.animateCharsOut = function(cb) {
    var char, displacement, rotation, _i, _len, _ref;
    _ref = this.chars;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      char = _ref[_i];
      char.$el.addClass('hide-border');
      displacement = _.random(20, 80);
      rotation = (displacement / 80) * 100;
      rotation = Math.random() > 0.5 ? rotation : -rotation;
      TweenLite.to(char.$el, 1, {
        delay: 1 + ((_.random(50, 200)) / 1000),
        opacity: 0,
        y: displacement,
        rotation: "" + rotation + "deg",
        ease: Cubic.easeIn
      });
    }
    setTimeout(cb, 2200);
    return null;
  };

  return Preloader;

})(AbstractView);

module.exports = Preloader;



},{"../AbstractView":22}],28:[function(require,module,exports){
var AboutPageView, AbstractView, ContributePageView, HomeView, Nav, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('../home/HomeView');

AboutPageView = require('../aboutPage/AboutPageView');

ContributePageView = require('../contributePage/ContributePageView');

Nav = require('../../router/Nav');

Wrapper = (function(_super) {
  __extends(Wrapper, _super);

  Wrapper.prototype.VIEW_TYPE_PAGE = 'page';

  Wrapper.prototype.VIEW_TYPE_MODAL = 'modal';

  Wrapper.prototype.template = 'wrapper';

  Wrapper.prototype.views = null;

  Wrapper.prototype.previousView = null;

  Wrapper.prototype.currentView = null;

  Wrapper.prototype.backgroundView = null;

  function Wrapper() {
    this.transitionViews = __bind(this.transitionViews, this);
    this.changeSubView = __bind(this.changeSubView, this);
    this.changeView = __bind(this.changeView, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.start = __bind(this.start, this);
    this.init = __bind(this.init, this);
    this.getViewByRoute = __bind(this.getViewByRoute, this);
    this.addClasses = __bind(this.addClasses, this);
    this.createClasses = __bind(this.createClasses, this);
    this.views = {
      home: {
        classRef: HomeView,
        route: this.CD().nav.sections.HOME,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      about: {
        classRef: AboutPageView,
        route: this.CD().nav.sections.ABOUT,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      contribute: {
        classRef: ContributePageView,
        route: this.CD().nav.sections.CONTRIBUTE,
        view: null,
        type: this.VIEW_TYPE_PAGE
      }
    };
    this.createClasses();
    Wrapper.__super__.constructor.call(this);
    return null;
  }

  Wrapper.prototype.createClasses = function() {
    var data, name, _ref;
    _ref = this.views;
    for (name in _ref) {
      data = _ref[name];
      this.views[name].view = new this.views[name].classRef;
    }
    return null;
  };

  Wrapper.prototype.addClasses = function() {
    var data, name, _ref, _results;
    _ref = this.views;
    _results = [];
    for (name in _ref) {
      data = _ref[name];
      if (data.type === this.VIEW_TYPE_PAGE) {
        _results.push(this.addChild(data.view));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  null;

  Wrapper.prototype.getViewByRoute = function(route) {
    var data, name, _ref;
    _ref = this.views;
    for (name in _ref) {
      data = _ref[name];
      if (route === this.views[name].route) {
        return this.views[name];
      }
    }
    return null;
  };

  Wrapper.prototype.init = function() {
    this.CD().appView.on('start', this.start);
    return null;
  };

  Wrapper.prototype.start = function() {
    this.CD().appView.off('start', this.start);
    this.bindEvents();
    return null;
  };

  Wrapper.prototype.bindEvents = function() {
    this.CD().nav.on(Nav.EVENT_CHANGE_VIEW, this.changeView);
    this.CD().nav.on(Nav.EVENT_CHANGE_SUB_VIEW, this.changeSubView);
    return null;
  };


  /*
  
  	THIS IS A MESS, SORT IT (neil)
   */

  Wrapper.prototype.changeView = function(previous, current) {
    this.previousView = this.getViewByRoute(previous.area);
    this.currentView = this.getViewByRoute(current.area);
    if (!this.previousView) {
      if (this.currentView.type === this.VIEW_TYPE_PAGE) {
        this.transitionViews(false, this.currentView.view);
      } else if (this.currentView.type === this.VIEW_TYPE_MODAL) {
        this.backgroundView = this.views.home;
        this.transitionViews(false, this.currentView.view, true);
      }
    } else {
      if (this.currentView.type === this.VIEW_TYPE_PAGE && this.previousView.type === this.VIEW_TYPE_PAGE) {
        this.transitionViews(this.previousView.view, this.currentView.view);
      } else if (this.currentView.type === this.VIEW_TYPE_MODAL && this.previousView.type === this.VIEW_TYPE_PAGE) {
        this.backgroundView = this.previousView;
        this.transitionViews(false, this.currentView.view, true);
      } else if (this.currentView.type === this.VIEW_TYPE_PAGE && this.previousView.type === this.VIEW_TYPE_MODAL) {
        this.backgroundView = this.backgroundView || this.views.home;
        if (this.backgroundView !== this.currentView) {
          this.transitionViews(this.previousView.view, this.currentView.view, false, true);
        } else if (this.backgroundView === this.currentView) {
          this.transitionViews(this.previousView.view, false);
        }
      } else if (this.currentView.type === this.VIEW_TYPE_MODAL && this.previousView.type === this.VIEW_TYPE_MODAL) {
        this.backgroundView = this.backgroundView || this.views.home;
        this.transitionViews(this.previousView.view, this.currentView.view, true);
      }
    }
    return null;
  };

  Wrapper.prototype.changeSubView = function(current) {
    this.currentView.view.trigger(Nav.EVENT_CHANGE_SUB_VIEW, current.sub);
    return null;
  };

  Wrapper.prototype.transitionViews = function(from, to, toModal, fromModal) {
    var _ref, _ref1;
    if (toModal == null) {
      toModal = false;
    }
    if (fromModal == null) {
      fromModal = false;
    }
    if (from === to) {
      return;
    }
    if (toModal) {
      if ((_ref = this.backgroundView.view) != null) {
        _ref.show();
      }
    }
    if (fromModal) {
      if ((_ref1 = this.backgroundView.view) != null) {
        _ref1.hide();
      }
    }
    if (from && to) {
      from.hide(to.show);
    } else if (from) {
      from.hide();
    } else if (to) {
      to.show();
    }
    return null;
  };

  return Wrapper;

})(AbstractView);

module.exports = Wrapper;



},{"../../router/Nav":13,"../AbstractView":22,"../aboutPage/AboutPageView":24,"../contributePage/ContributePageView":29,"../home/HomeView":30}],29:[function(require,module,exports){
var AbstractViewPage, ContributePageView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

ContributePageView = (function(_super) {
  __extends(ContributePageView, _super);

  ContributePageView.prototype.template = 'page-contribute';

  function ContributePageView() {
    this.templateVars = {
      desc: this.CD().locale.get("contribute_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    ContributePageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return ContributePageView;

})(AbstractViewPage);

module.exports = ContributePageView;



},{"../AbstractViewPage":23}],30:[function(require,module,exports){
var AbstractViewPage, HomeView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

HomeView = (function(_super) {
  __extends(HomeView, _super);

  HomeView.prototype.template = 'page-home';

  function HomeView() {
    this.templateVars = {
      desc: this.CD().locale.get("home_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new ExampleClass
     */
    HomeView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return HomeView;

})(AbstractViewPage);

module.exports = HomeView;



},{"../AbstractViewPage":23}],31:[function(require,module,exports){
var AbstractModal, AbstractView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

AbstractModal = (function(_super) {
  __extends(AbstractModal, _super);

  AbstractModal.prototype.$window = null;


  /* override in individual classes */

  AbstractModal.prototype.name = null;

  AbstractModal.prototype.template = null;

  function AbstractModal() {
    this.closeClick = __bind(this.closeClick, this);
    this.animateOut = __bind(this.animateOut, this);
    this.animateIn = __bind(this.animateIn, this);
    this.onKeyUp = __bind(this.onKeyUp, this);
    this.setListeners = __bind(this.setListeners, this);
    this.dispose = __bind(this.dispose, this);
    this.hide = __bind(this.hide, this);
    this.$window = $(window);
    AbstractModal.__super__.constructor.call(this);
    this.CD().appView.addChild(this);
    this.setListeners('on');
    this.animateIn();
    return null;
  }

  AbstractModal.prototype.hide = function() {
    this.animateOut((function(_this) {
      return function() {
        return _this.CD().appView.remove(_this);
      };
    })(this));
    return null;
  };

  AbstractModal.prototype.dispose = function() {
    this.setListeners('off');
    this.CD().appView.modalManager.modals[this.name].view = null;
    return null;
  };

  AbstractModal.prototype.setListeners = function(setting) {
    this.$window[setting]('keyup', this.onKeyUp);
    this.$('[data-close]')[setting]('click', this.closeClick);
    return null;
  };

  AbstractModal.prototype.onKeyUp = function(e) {
    if (e.keyCode === 27) {
      this.hide();
    }
    return null;
  };

  AbstractModal.prototype.animateIn = function() {
    TweenLite.to(this.$el, 0.3, {
      'visibility': 'visible',
      'opacity': 1,
      ease: Quad.easeOut
    });
    TweenLite.to(this.$el.find('.inner'), 0.3, {
      delay: 0.15,
      'transform': 'scale(1)',
      'visibility': 'visible',
      'opacity': 1,
      ease: Back.easeOut
    });
    return null;
  };

  AbstractModal.prototype.animateOut = function(callback) {
    TweenLite.to(this.$el, 0.3, {
      delay: 0.15,
      'opacity': 0,
      ease: Quad.easeOut,
      onComplete: callback
    });
    TweenLite.to(this.$el.find('.inner'), 0.3, {
      'transform': 'scale(0.8)',
      'opacity': 0,
      ease: Back.easeIn
    });
    return null;
  };

  AbstractModal.prototype.closeClick = function(e) {
    e.preventDefault();
    this.hide();
    return null;
  };

  return AbstractModal;

})(AbstractView);

module.exports = AbstractModal;



},{"../AbstractView":22}],32:[function(require,module,exports){
var AbstractModal, OrientationModal,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModal = require('./AbstractModal');

OrientationModal = (function(_super) {
  __extends(OrientationModal, _super);

  OrientationModal.prototype.name = 'orientationModal';

  OrientationModal.prototype.template = 'orientation-modal';

  OrientationModal.prototype.cb = null;

  function OrientationModal(cb) {
    this.cb = cb;
    this.onUpdateDims = __bind(this.onUpdateDims, this);
    this.setListeners = __bind(this.setListeners, this);
    this.hide = __bind(this.hide, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      name: this.name
    };
    OrientationModal.__super__.constructor.call(this);
    return null;
  }

  OrientationModal.prototype.init = function() {
    return null;
  };

  OrientationModal.prototype.hide = function(stillLandscape) {
    if (stillLandscape == null) {
      stillLandscape = true;
    }
    this.animateOut((function(_this) {
      return function() {
        _this.CD().appView.remove(_this);
        if (!stillLandscape) {
          return typeof _this.cb === "function" ? _this.cb() : void 0;
        }
      };
    })(this));
    return null;
  };

  OrientationModal.prototype.setListeners = function(setting) {
    OrientationModal.__super__.setListeners.apply(this, arguments);
    this.CD().appView[setting]('updateDims', this.onUpdateDims);
    this.$el[setting]('touchend click', this.hide);
    return null;
  };

  OrientationModal.prototype.onUpdateDims = function(dims) {
    if (dims.o === 'portrait') {
      this.hide(false);
    }
    return null;
  };

  return OrientationModal;

})(AbstractModal);

module.exports = OrientationModal;



},{"./AbstractModal":31}],33:[function(require,module,exports){
var AbstractView, ModalManager, OrientationModal,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

OrientationModal = require('./OrientationModal');

ModalManager = (function(_super) {
  __extends(ModalManager, _super);

  ModalManager.prototype.modals = {
    orientationModal: {
      classRef: OrientationModal,
      view: null
    }
  };

  function ModalManager() {
    this.showModal = __bind(this.showModal, this);
    this.hideOpenModal = __bind(this.hideOpenModal, this);
    this.isOpen = __bind(this.isOpen, this);
    this.init = __bind(this.init, this);
    ModalManager.__super__.constructor.call(this);
    return null;
  }

  ModalManager.prototype.init = function() {
    return null;
  };

  ModalManager.prototype.isOpen = function() {
    var modal, name, _ref;
    _ref = this.modals;
    for (name in _ref) {
      modal = _ref[name];
      if (this.modals[name].view) {
        return true;
      }
    }
    return false;
  };

  ModalManager.prototype.hideOpenModal = function() {
    var modal, name, openModal, _ref;
    _ref = this.modals;
    for (name in _ref) {
      modal = _ref[name];
      if (this.modals[name].view) {
        openModal = this.modals[name].view;
      }
    }
    if (openModal != null) {
      openModal.hide();
    }
    return null;
  };

  ModalManager.prototype.showModal = function(name, cb) {
    if (cb == null) {
      cb = null;
    }
    if (this.modals[name].view) {
      return;
    }
    this.modals[name].view = new this.modals[name].classRef(cb);
    return null;
  };

  return ModalManager;

})(AbstractView);

module.exports = ModalManager;



},{"../AbstractView":22,"./OrientationModal":32}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvQXBwLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHBEYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQVBJLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0Fic3RyYWN0RGF0YS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9Mb2NhbGUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvVGVtcGxhdGVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9OYXYuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0FuYWx5dGljcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQXV0aE1hbmFnZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0ZhY2Vib29rLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Hb29nbGVQbHVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9NZWRpYVF1ZXJpZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1JlcXVlc3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvU2hhcmUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlld1BhZ2UuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9Gb290ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9IZWFkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QcmVsb2FkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9XcmFwcGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdIQUFBO0VBQUEsa0ZBQUE7O0FBQUEsU0FBQSxHQUFlLE9BQUEsQ0FBUSxtQkFBUixDQUFmLENBQUE7O0FBQUEsV0FDQSxHQUFlLE9BQUEsQ0FBUSxxQkFBUixDQURmLENBQUE7O0FBQUEsS0FFQSxHQUFlLE9BQUEsQ0FBUSxlQUFSLENBRmYsQ0FBQTs7QUFBQSxRQUdBLEdBQWUsT0FBQSxDQUFRLGtCQUFSLENBSGYsQ0FBQTs7QUFBQSxVQUlBLEdBQWUsT0FBQSxDQUFRLG9CQUFSLENBSmYsQ0FBQTs7QUFBQSxTQUtBLEdBQWUsT0FBQSxDQUFRLGtCQUFSLENBTGYsQ0FBQTs7QUFBQSxNQU1BLEdBQWUsT0FBQSxDQUFRLGVBQVIsQ0FOZixDQUFBOztBQUFBLE1BT0EsR0FBZSxPQUFBLENBQVEsaUJBQVIsQ0FQZixDQUFBOztBQUFBLEdBUUEsR0FBZSxPQUFBLENBQVEsY0FBUixDQVJmLENBQUE7O0FBQUEsT0FTQSxHQUFlLE9BQUEsQ0FBUSxXQUFSLENBVGYsQ0FBQTs7QUFBQSxPQVVBLEdBQWUsT0FBQSxDQUFRLFdBQVIsQ0FWZixDQUFBOztBQUFB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WSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQTFCLENBQTNCO09BQUY7QUFBQSxLQUFBOztNQUVBLFNBQVMsQ0FBRSxJQUFYLENBQUE7S0FGQTtXQUlBLEtBTmU7RUFBQSxDQW5CaEIsQ0FBQTs7QUFBQSx5QkEyQkEsU0FBQSxHQUFZLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTs7TUFBTyxLQUFHO0tBRXJCO0FBQUEsSUFBQSxJQUFVLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBeEI7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFkLEdBQXlCLElBQUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxRQUFkLENBQXVCLEVBQXZCLENBRnpCLENBQUE7V0FJQSxLQU5XO0VBQUEsQ0EzQlosQ0FBQTs7c0JBQUE7O0dBSDBCLGFBSDNCLENBQUE7O0FBQUEsTUF5Q00sQ0FBQyxPQUFQLEdBQWlCLFlBekNqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcCA9IHJlcXVpcmUgJy4vQXBwJ1xuXG4jIFBST0RVQ1RJT04gRU5WSVJPTk1FTlQgLSBtYXkgd2FudCB0byB1c2Ugc2VydmVyLXNldCB2YXJpYWJsZXMgaGVyZVxuIyBJU19MSVZFID0gZG8gLT4gcmV0dXJuIGlmIHdpbmRvdy5sb2NhdGlvbi5ob3N0LmluZGV4T2YoJ2xvY2FsaG9zdCcpID4gLTEgb3Igd2luZG93LmxvY2F0aW9uLnNlYXJjaCBpcyAnP2QnIHRoZW4gZmFsc2UgZWxzZSB0cnVlXG5cbiMjI1xuXG5XSVAgLSB0aGlzIHdpbGwgaWRlYWxseSBjaGFuZ2UgdG8gb2xkIGZvcm1hdCAoYWJvdmUpIHdoZW4gY2FuIGZpZ3VyZSBpdCBvdXRcblxuIyMjXG5cbklTX0xJVkUgPSBmYWxzZVxuXG4jIE9OTFkgRVhQT1NFIEFQUCBHTE9CQUxMWSBJRiBMT0NBTCBPUiBERVYnSU5HXG52aWV3ID0gaWYgSVNfTElWRSB0aGVuIHt9IGVsc2UgKHdpbmRvdyBvciBkb2N1bWVudClcblxuIyBERUNMQVJFIE1BSU4gQVBQTElDQVRJT05cbnZpZXcuQ0QgPSBuZXcgQXBwIElTX0xJVkVcbnZpZXcuQ0QuaW5pdCgpXG4iLCJBbmFseXRpY3MgICAgPSByZXF1aXJlICcuL3V0aWxzL0FuYWx5dGljcydcbkF1dGhNYW5hZ2VyICA9IHJlcXVpcmUgJy4vdXRpbHMvQXV0aE1hbmFnZXInXG5TaGFyZSAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1NoYXJlJ1xuRmFjZWJvb2sgICAgID0gcmVxdWlyZSAnLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4vdXRpbHMvR29vZ2xlUGx1cydcblRlbXBsYXRlcyAgICA9IHJlcXVpcmUgJy4vZGF0YS9UZW1wbGF0ZXMnXG5Mb2NhbGUgICAgICAgPSByZXF1aXJlICcuL2RhdGEvTG9jYWxlJ1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvUm91dGVyJ1xuTmF2ICAgICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvTmF2J1xuQXBwRGF0YSAgICAgID0gcmVxdWlyZSAnLi9BcHBEYXRhJ1xuQXBwVmlldyAgICAgID0gcmVxdWlyZSAnLi9BcHBWaWV3J1xuTWVkaWFRdWVyaWVzID0gcmVxdWlyZSAnLi91dGlscy9NZWRpYVF1ZXJpZXMnXG5cbmNsYXNzIEFwcFxuXG4gICAgTElWRSAgICAgICA6IG51bGxcbiAgICBCQVNFX1BBVEggIDogd2luZG93LmNvbmZpZy5ob3N0bmFtZVxuICAgIGxvY2FsZUNvZGUgOiB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcbiAgICBvYmpSZWFkeSAgIDogMFxuXG4gICAgX3RvQ2xlYW4gICA6IFsnb2JqUmVhZHknLCAnc2V0RmxhZ3MnLCAnb2JqZWN0Q29tcGxldGUnLCAnaW5pdCcsICdpbml0T2JqZWN0cycsICdpbml0U0RLcycsICdpbml0QXBwJywgJ2dvJywgJ2NsZWFudXAnLCAnX3RvQ2xlYW4nXVxuXG4gICAgY29uc3RydWN0b3IgOiAoQExJVkUpIC0+XG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIHNldEZsYWdzIDogPT5cblxuICAgICAgICB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKClcblxuICAgICAgICBNZWRpYVF1ZXJpZXMuc2V0dXAoKTtcblxuICAgICAgICBASVNfQU5EUk9JRCAgICA9IHVhLmluZGV4T2YoJ2FuZHJvaWQnKSA+IC0xXG4gICAgICAgIEBJU19GSVJFRk9YICAgID0gdWEuaW5kZXhPZignZmlyZWZveCcpID4gLTFcbiAgICAgICAgQElTX0NIUk9NRV9JT1MgPSBpZiB1YS5tYXRjaCgnY3Jpb3MnKSB0aGVuIHRydWUgZWxzZSBmYWxzZSAjIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEzODA4MDUzXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb2JqZWN0Q29tcGxldGUgOiA9PlxuXG4gICAgICAgIEBvYmpSZWFkeSsrXG4gICAgICAgIEBpbml0QXBwKCkgaWYgQG9ialJlYWR5ID49IDRcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0IDogPT5cblxuICAgICAgICBAaW5pdE9iamVjdHMoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRPYmplY3RzIDogPT5cblxuICAgICAgICBAdGVtcGxhdGVzID0gbmV3IFRlbXBsYXRlcyBcIi9kYXRhL3RlbXBsYXRlcyN7KGlmIEBMSVZFIHRoZW4gJy5taW4nIGVsc2UgJycpfS54bWxcIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBsb2NhbGUgICAgPSBuZXcgTG9jYWxlIFwiL2RhdGEvbG9jYWxlcy9zdHJpbmdzLmpzb25cIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBhbmFseXRpY3MgPSBuZXcgQW5hbHl0aWNzIFwiL2RhdGEvdHJhY2tpbmcuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFwcERhdGEgICA9IG5ldyBBcHBEYXRhIEBvYmplY3RDb21wbGV0ZVxuXG4gICAgICAgICMgaWYgbmV3IG9iamVjdHMgYXJlIGFkZGVkIGRvbid0IGZvcmdldCB0byBjaGFuZ2UgdGhlIGBAb2JqZWN0Q29tcGxldGVgIGZ1bmN0aW9uXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdFNES3MgOiA9PlxuXG4gICAgICAgIEZhY2Vib29rLmxvYWQoKVxuICAgICAgICBHb29nbGVQbHVzLmxvYWQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRBcHAgOiA9PlxuXG4gICAgICAgIEBzZXRGbGFncygpXG5cbiAgICAgICAgIyMjIFN0YXJ0cyBhcHBsaWNhdGlvbiAjIyNcbiAgICAgICAgQGFwcFZpZXcgPSBuZXcgQXBwVmlld1xuICAgICAgICBAcm91dGVyICA9IG5ldyBSb3V0ZXJcbiAgICAgICAgQG5hdiAgICAgPSBuZXcgTmF2XG4gICAgICAgIEBhdXRoICAgID0gbmV3IEF1dGhNYW5hZ2VyXG4gICAgICAgIEBzaGFyZSAgID0gbmV3IFNoYXJlXG5cbiAgICAgICAgQGdvKClcblxuICAgICAgICBAaW5pdFNES3MoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGdvIDogPT5cblxuICAgICAgICAjIyMgQWZ0ZXIgZXZlcnl0aGluZyBpcyBsb2FkZWQsIGtpY2tzIG9mZiB3ZWJzaXRlICMjI1xuICAgICAgICBAYXBwVmlldy5yZW5kZXIoKVxuXG4gICAgICAgICMjIyByZW1vdmUgcmVkdW5kYW50IGluaXRpYWxpc2F0aW9uIG1ldGhvZHMgLyBwcm9wZXJ0aWVzICMjI1xuICAgICAgICBAY2xlYW51cCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgY2xlYW51cCA6ID0+XG5cbiAgICAgICAgZm9yIGZuIGluIEBfdG9DbGVhblxuICAgICAgICAgICAgQFtmbl0gPSBudWxsXG4gICAgICAgICAgICBkZWxldGUgQFtmbl1cblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuL2RhdGEvQWJzdHJhY3REYXRhJ1xuUmVxdWVzdGVyICAgID0gcmVxdWlyZSAnLi91dGlscy9SZXF1ZXN0ZXInXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuL2RhdGEvQVBJJ1xuXG5jbGFzcyBBcHBEYXRhIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cbiAgICBjYWxsYmFjayA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKEBjYWxsYmFjaykgLT5cblxuICAgICAgICAjIyNcblxuICAgICAgICBhZGQgYWxsIGRhdGEgY2xhc3NlcyBoZXJlXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIEBnZXRTdGFydERhdGEoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICAjIyNcbiAgICBnZXQgYXBwIGJvb3RzdHJhcCBkYXRhIC0gZW1iZWQgaW4gSFRNTCBvciBBUEkgZW5kcG9pbnRcbiAgICAjIyNcbiAgICBnZXRTdGFydERhdGEgOiA9PlxuICAgICAgICBcbiAgICAgICAgaWYgQVBJLmdldCgnc3RhcnQnKVxuXG4gICAgICAgICAgICByID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICAgICB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgICAgICByLmRvbmUgQG9uU3RhcnREYXRhUmVjZWl2ZWRcbiAgICAgICAgICAgIHIuZmFpbCA9PlxuXG4gICAgICAgICAgICAgICAgIyBjb25zb2xlLmVycm9yIFwiZXJyb3IgbG9hZGluZyBhcGkgc3RhcnQgZGF0YVwiXG5cbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICB0aGlzIGlzIG9ubHkgdGVtcG9yYXJ5LCB3aGlsZSB0aGVyZSBpcyBubyBib290c3RyYXAgZGF0YSBoZXJlLCBub3JtYWxseSB3b3VsZCBoYW5kbGUgZXJyb3IgLyBmYWlsXG4gICAgICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYm9vdHN0cmFwIGRhdGEgcmVjZWl2ZWQsIGFwcCByZWFkeSB0byBnb1xuXG4gICAgICAgICMjI1xuXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBEYXRhXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUHJlbG9hZGVyICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUHJlbG9hZGVyJ1xuSGVhZGVyICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvSGVhZGVyJ1xuV3JhcHBlciAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvV3JhcHBlcidcbkZvb3RlciAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0Zvb3Rlcidcbk1vZGFsTWFuYWdlciA9IHJlcXVpcmUgJy4vdmlldy9tb2RhbHMvX01vZGFsTWFuYWdlcidcblxuY2xhc3MgQXBwVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnbWFpbidcblxuICAgICR3aW5kb3cgIDogbnVsbFxuICAgICRib2R5ICAgIDogbnVsbFxuXG4gICAgd3JhcHBlciAgOiBudWxsXG4gICAgZm9vdGVyICAgOiBudWxsXG5cbiAgICBkaW1zIDpcbiAgICAgICAgdyA6IG51bGxcbiAgICAgICAgaCA6IG51bGxcbiAgICAgICAgbyA6IG51bGxcbiAgICAgICAgYyA6IG51bGxcblxuICAgIGV2ZW50cyA6XG4gICAgICAgICdjbGljayBhJyA6ICdsaW5rTWFuYWdlcidcblxuICAgIEVWRU5UX1VQREFURV9ESU1FTlNJT05TIDogJ0VWRU5UX1VQREFURV9ESU1FTlNJT05TJ1xuXG4gICAgTU9CSUxFX1dJRFRIIDogNzAwXG4gICAgTU9CSUxFICAgICAgIDogJ21vYmlsZSdcbiAgICBOT05fTU9CSUxFICAgOiAnbm9uX21vYmlsZSdcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAJHdpbmRvdyA9ICQod2luZG93KVxuICAgICAgICBAJGJvZHkgICA9ICQoJ2JvZHknKS5lcSgwKVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgIGRpc2FibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vbiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG4gICAgICAgIHJldHVyblxuXG4gICAgZW5hYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub2ZmICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcbiAgICAgICAgcmV0dXJuXG5cbiAgICBvblRvdWNoTW92ZTogKCBlICkgLT5cblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgcmV0dXJuXG5cbiAgICByZW5kZXIgOiA9PlxuXG4gICAgICAgIEBiaW5kRXZlbnRzKClcblxuICAgICAgICBAcHJlbG9hZGVyICAgID0gbmV3IFByZWxvYWRlclxuICAgICAgICBAcHJlbG9hZGVyLnNob3coKVxuXG4gICAgICAgIEBtb2RhbE1hbmFnZXIgPSBuZXcgTW9kYWxNYW5hZ2VyXG5cbiAgICAgICAgQGhlYWRlciAgPSBuZXcgSGVhZGVyXG4gICAgICAgIEB3cmFwcGVyID0gbmV3IFdyYXBwZXJcbiAgICAgICAgQGZvb3RlciAgPSBuZXcgRm9vdGVyXG5cbiAgICAgICAgQFxuICAgICAgICAgICAgLmFkZENoaWxkIEBoZWFkZXJcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAd3JhcHBlclxuICAgICAgICAgICAgLmFkZENoaWxkIEBmb290ZXJcblxuICAgICAgICBAb25BbGxSZW5kZXJlZCgpXG4gICAgICAgIHJldHVyblxuXG4gICAgYmluZEV2ZW50cyA6ID0+XG5cbiAgICAgICAgQG9uICdhbGxSZW5kZXJlZCcsIEBvbkFsbFJlbmRlcmVkXG5cbiAgICAgICAgQG9uUmVzaXplKClcblxuICAgICAgICBAb25SZXNpemUgPSBfLmRlYm91bmNlIEBvblJlc2l6ZSwgMzAwXG4gICAgICAgIEAkd2luZG93Lm9uICdyZXNpemUgb3JpZW50YXRpb25jaGFuZ2UnLCBAb25SZXNpemVcbiAgICAgICAgcmV0dXJuXG5cbiAgICBvbkFsbFJlbmRlcmVkIDogPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwib25BbGxSZW5kZXJlZCA6ID0+XCJcblxuICAgICAgICBAJGJvZHkucHJlcGVuZCBAJGVsXG5cbiAgICAgICAgQGJlZ2luKClcbiAgICAgICAgcmV0dXJuXG5cbiAgICBiZWdpbiA6ID0+XG5cbiAgICAgICAgQHRyaWdnZXIgJ3N0YXJ0J1xuXG4gICAgICAgIEBDRCgpLnJvdXRlci5zdGFydCgpXG5cbiAgICAgICAgIyBAcHJlbG9hZGVyLmhpZGUoKVxuICAgICAgICByZXR1cm5cblxuICAgIG9uUmVzaXplIDogPT5cblxuICAgICAgICBAZ2V0RGltcygpXG4gICAgICAgIHJldHVyblxuXG4gICAgZ2V0RGltcyA6ID0+XG5cbiAgICAgICAgdyA9IHdpbmRvdy5pbm5lcldpZHRoIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCBvciBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICAgICAgIGggPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodFxuXG4gICAgICAgIEBkaW1zID1cbiAgICAgICAgICAgIHcgOiB3XG4gICAgICAgICAgICBoIDogaFxuICAgICAgICAgICAgbyA6IGlmIGggPiB3IHRoZW4gJ3BvcnRyYWl0JyBlbHNlICdsYW5kc2NhcGUnXG4gICAgICAgICAgICBjIDogaWYgdyA8PSBATU9CSUxFX1dJRFRIIHRoZW4gQE1PQklMRSBlbHNlIEBOT05fTU9CSUxFXG5cbiAgICAgICAgQHRyaWdnZXIgQEVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAZGltc1xuXG4gICAgICAgIHJldHVyblxuXG4gICAgbGlua01hbmFnZXIgOiAoZSkgPT5cblxuICAgICAgICBocmVmID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaHJlZlxuXG4gICAgICAgIEBuYXZpZ2F0ZVRvVXJsIGhyZWYsIGVcblxuICAgICAgICByZXR1cm5cblxuICAgIG5hdmlnYXRlVG9VcmwgOiAoIGhyZWYsIGUgPSBudWxsICkgPT5cblxuICAgICAgICByb3V0ZSAgID0gaWYgaHJlZi5tYXRjaChAQ0QoKS5CQVNFX1BBVEgpIHRoZW4gaHJlZi5zcGxpdChAQ0QoKS5CQVNFX1BBVEgpWzFdIGVsc2UgaHJlZlxuICAgICAgICBzZWN0aW9uID0gaWYgcm91dGUuaW5kZXhPZignLycpIGlzIDAgdGhlbiByb3V0ZS5zcGxpdCgnLycpWzFdIGVsc2Ugcm91dGVcblxuICAgICAgICBpZiBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBzZWN0aW9uXG4gICAgICAgICAgICBlPy5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBAQ0QoKS5yb3V0ZXIubmF2aWdhdGVUbyByb3V0ZVxuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgQGhhbmRsZUV4dGVybmFsTGluayBocmVmXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICBoYW5kbGVFeHRlcm5hbExpbmsgOiAoZGF0YSkgPT4gXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYmluZCB0cmFja2luZyBldmVudHMgaWYgbmVjZXNzYXJ5XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgcmV0dXJuXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwVmlld1xuIiwiVGVtcGxhdGVNb2RlbCA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5cbmNsYXNzIFRlbXBsYXRlc0NvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0bW9kZWwgOiBUZW1wbGF0ZU1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzQ29sbGVjdGlvblxuIiwiQVBJUm91dGVNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL0FQSVJvdXRlTW9kZWwnXG5cbmNsYXNzIEFQSVxuXG5cdEBtb2RlbCA6IG5ldyBBUElSb3V0ZU1vZGVsXG5cblx0QGdldENvbnRhbnRzIDogPT5cblxuXHRcdCMjIyBhZGQgbW9yZSBpZiB3ZSB3YW5uYSB1c2UgaW4gQVBJIHN0cmluZ3MgIyMjXG5cdFx0QkFTRV9QQVRIIDogQENEKCkuQkFTRV9QQVRIXG5cblx0QGdldCA6IChuYW1lLCB2YXJzKSA9PlxuXG5cdFx0dmFycyA9ICQuZXh0ZW5kIHRydWUsIHZhcnMsIEBnZXRDb250YW50cygpXG5cdFx0cmV0dXJuIEBzdXBwbGFudFN0cmluZyBAbW9kZWwuZ2V0KG5hbWUpLCB2YXJzXG5cblx0QHN1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscykgLT5cblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSAve3sgKFtee31dKikgfX0vZywgKGEsIGIpIC0+XG5cdFx0XHRyID0gdmFsc1tiXSBvciBpZiB0eXBlb2YgdmFsc1tiXSBpcyAnbnVtYmVyJyB0aGVuIHZhbHNbYl0udG9TdHJpbmcoKSBlbHNlICcnXG5cdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdEBDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQVBJXG4iLCJjbGFzcyBBYnN0cmFjdERhdGFcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRfLmV4dGVuZCBALCBCYWNrYm9uZS5FdmVudHNcblxuXHRcdHJldHVybiBudWxsXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0RGF0YVxuIiwiTG9jYWxlc01vZGVsID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvTG9jYWxlc01vZGVsJ1xuQVBJICAgICAgICAgID0gcmVxdWlyZSAnLi4vZGF0YS9BUEknXG5cbiMjI1xuIyBMb2NhbGUgTG9hZGVyICNcblxuRmlyZXMgYmFjayBhbiBldmVudCB3aGVuIGNvbXBsZXRlXG5cbiMjI1xuY2xhc3MgTG9jYWxlXG5cbiAgICBsYW5nICAgICA6IG51bGxcbiAgICBkYXRhICAgICA6IG51bGxcbiAgICBjYWxsYmFjayA6IG51bGxcbiAgICBiYWNrdXAgICA6IG51bGxcbiAgICBkZWZhdWx0ICA6ICdlbi1nYidcblxuICAgIGNvbnN0cnVjdG9yIDogKGRhdGEsIGNiKSAtPlxuXG4gICAgICAgICMjIyBzdGFydCBMb2NhbGUgTG9hZGVyLCBkZWZpbmUgbG9jYWxlIGJhc2VkIG9uIGJyb3dzZXIgbGFuZ3VhZ2UgIyMjXG5cbiAgICAgICAgQGNhbGxiYWNrID0gY2JcbiAgICAgICAgQGJhY2t1cCA9IGRhdGFcblxuICAgICAgICBAbGFuZyA9IEBnZXRMYW5nKClcblxuICAgICAgICBpZiBBUEkuZ2V0KCdsb2NhbGUnLCB7IGNvZGUgOiBAbGFuZyB9KVxuXG4gICAgICAgICAgICAkLmFqYXhcbiAgICAgICAgICAgICAgICB1cmwgICAgIDogQVBJLmdldCggJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0gKVxuICAgICAgICAgICAgICAgIHR5cGUgICAgOiAnR0VUJ1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICAgICAgZXJyb3IgICA6IEBsb2FkQmFja3VwXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAbG9hZEJhY2t1cCgpXG5cbiAgICAgICAgbnVsbFxuICAgICAgICAgICAgXG4gICAgZ2V0TGFuZyA6ID0+XG5cbiAgICAgICAgaWYgd2luZG93LmxvY2F0aW9uLnNlYXJjaCBhbmQgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5tYXRjaCgnbGFuZz0nKVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zcGxpdCgnbGFuZz0nKVsxXS5zcGxpdCgnJicpWzBdXG5cbiAgICAgICAgZWxzZSBpZiB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcblxuICAgICAgICAgICAgbGFuZyA9IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAgbGFuZyA9IEBkZWZhdWx0XG5cbiAgICAgICAgbGFuZ1xuXG4gICAgb25TdWNjZXNzIDogKGV2ZW50KSA9PlxuXG4gICAgICAgICMjIyBGaXJlcyBiYWNrIGFuIGV2ZW50IG9uY2UgaXQncyBjb21wbGV0ZSAjIyNcblxuICAgICAgICBkID0gbnVsbFxuXG4gICAgICAgIGlmIGV2ZW50LnJlc3BvbnNlVGV4dFxuICAgICAgICAgICAgZCA9IEpTT04ucGFyc2UgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBkID0gZXZlbnRcblxuICAgICAgICBAZGF0YSA9IG5ldyBMb2NhbGVzTW9kZWwgZFxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBsb2FkQmFja3VwIDogPT5cblxuICAgICAgICAjIyMgV2hlbiBBUEkgbm90IGF2YWlsYWJsZSwgdHJpZXMgdG8gbG9hZCB0aGUgc3RhdGljIC50eHQgbG9jYWxlICMjI1xuXG4gICAgICAgICQuYWpheCBcbiAgICAgICAgICAgIHVybCAgICAgIDogQGJhY2t1cFxuICAgICAgICAgICAgZGF0YVR5cGUgOiAnanNvbidcbiAgICAgICAgICAgIGNvbXBsZXRlIDogQG9uU3VjY2Vzc1xuICAgICAgICAgICAgZXJyb3IgICAgOiA9PiBjb25zb2xlLmxvZyAnZXJyb3Igb24gbG9hZGluZyBiYWNrdXAnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgICMjIyBnZXQgU3RyaW5nIGZyb20gbG9jYWxlXG4gICAgICAgICsgaWQgOiBzdHJpbmcgaWQgb2YgdGhlIExvY2FsaXNlZCBTdHJpbmdcbiAgICAgICAgIyMjXG5cbiAgICAgICAgcmV0dXJuIEBkYXRhLmdldFN0cmluZyBpZFxuXG4gICAgZ2V0TG9jYWxlSW1hZ2UgOiAodXJsKSA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuY29uZmlnLkNETiArIFwiL2ltYWdlcy9sb2NhbGUvXCIgKyB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGUgKyBcIi9cIiArIHVybFxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZVxuIiwiVGVtcGxhdGVNb2RlbCAgICAgICA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5UZW1wbGF0ZXNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vY29sbGVjdGlvbnMvY29yZS9UZW1wbGF0ZXNDb2xsZWN0aW9uJ1xuXG5jbGFzcyBUZW1wbGF0ZXNcblxuICAgIHRlbXBsYXRlcyA6IG51bGxcbiAgICBjYiAgICAgICAgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6ICh0ZW1wbGF0ZXMsIGNhbGxiYWNrKSAtPlxuXG4gICAgICAgIEBjYiA9IGNhbGxiYWNrXG5cbiAgICAgICAgJC5hamF4IHVybCA6IHRlbXBsYXRlcywgc3VjY2VzcyA6IEBwYXJzZVhNTFxuICAgICAgICAgICBcbiAgICAgICAgbnVsbFxuXG4gICAgcGFyc2VYTUwgOiAoZGF0YSkgPT5cblxuICAgICAgICB0ZW1wID0gW11cblxuICAgICAgICAkKGRhdGEpLmZpbmQoJ3RlbXBsYXRlJykuZWFjaCAoa2V5LCB2YWx1ZSkgLT5cbiAgICAgICAgICAgICR2YWx1ZSA9ICQodmFsdWUpXG4gICAgICAgICAgICB0ZW1wLnB1c2ggbmV3IFRlbXBsYXRlTW9kZWxcbiAgICAgICAgICAgICAgICBpZCAgIDogJHZhbHVlLmF0dHIoJ2lkJykudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgIHRleHQgOiAkLnRyaW0gJHZhbHVlLnRleHQoKVxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzQ29sbGVjdGlvbiB0ZW1wXG5cbiAgICAgICAgQGNiPygpXG4gICAgICAgIFxuICAgICAgICBudWxsICAgICAgICBcblxuICAgIGdldCA6IChpZCkgPT5cblxuICAgICAgICB0ID0gQHRlbXBsYXRlcy53aGVyZSBpZCA6IGlkXG4gICAgICAgIHQgPSB0WzBdLmdldCAndGV4dCdcbiAgICAgICAgXG4gICAgICAgIHJldHVybiAkLnRyaW0gdFxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlc1xuIiwiY2xhc3MgQVBJUm91dGVNb2RlbCBleHRlbmRzIEJhY2tib25lLkRlZXBNb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuXG4gICAgICAgIHN0YXJ0ICAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9QQVRIIH19L2FwaS9zdGFydFwiXG5cbiAgICAgICAgbG9jYWxlICAgICAgICA6IFwiXCIgIyBFZzogXCJ7eyBCQVNFX1BBVEggfX0vYXBpL2wxMG4ve3sgY29kZSB9fVwiXG5cbiAgICAgICAgdXNlciAgICAgICAgICA6XG4gICAgICAgICAgICBsb2dpbiAgICAgIDogXCJ7eyBCQVNFX1BBVEggfX0vYXBpL3VzZXIvbG9naW5cIlxuICAgICAgICAgICAgcmVnaXN0ZXIgICA6IFwie3sgQkFTRV9QQVRIIH19L2FwaS91c2VyL3JlZ2lzdGVyXCJcbiAgICAgICAgICAgIHBhc3N3b3JkICAgOiBcInt7IEJBU0VfUEFUSCB9fS9hcGkvdXNlci9wYXNzd29yZFwiXG4gICAgICAgICAgICB1cGRhdGUgICAgIDogXCJ7eyBCQVNFX1BBVEggfX0vYXBpL3VzZXIvdXBkYXRlXCJcbiAgICAgICAgICAgIGxvZ291dCAgICAgOiBcInt7IEJBU0VfUEFUSCB9fS9hcGkvdXNlci9sb2dvdXRcIlxuICAgICAgICAgICAgcmVtb3ZlICAgICA6IFwie3sgQkFTRV9QQVRIIH19L2FwaS91c2VyL3JlbW92ZVwiXG5cbm1vZHVsZS5leHBvcnRzID0gQVBJUm91dGVNb2RlbFxuIiwiY2xhc3MgTG9jYWxlc01vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuICAgIGRlZmF1bHRzIDpcbiAgICAgICAgY29kZSAgICAgOiBudWxsXG4gICAgICAgIGxhbmd1YWdlIDogbnVsbFxuICAgICAgICBzdHJpbmdzICA6IG51bGxcbiAgICAgICAgICAgIFxuICAgIGdldF9sYW5ndWFnZSA6ID0+XG4gICAgICAgIHJldHVybiBAZ2V0KCdsYW5ndWFnZScpXG5cbiAgICBnZXRTdHJpbmcgOiAoaWQpID0+XG4gICAgICAgICgocmV0dXJuIGUgaWYoYSBpcyBpZCkpIGZvciBhLCBlIG9mIHZbJ3N0cmluZ3MnXSkgZm9yIGssIHYgb2YgQGdldCgnc3RyaW5ncycpXG4gICAgICAgIGNvbnNvbGUud2FybiBcIkxvY2FsZXMgLT4gbm90IGZvdW5kIHN0cmluZzogI3tpZH1cIlxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlc01vZGVsXG4iLCJjbGFzcyBUZW1wbGF0ZU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuXHRkZWZhdWx0cyA6IFxuXG5cdFx0aWQgICA6IFwiXCJcblx0XHR0ZXh0IDogXCJcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlTW9kZWxcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9Sb3V0ZXInXG5cbmNsYXNzIE5hdiBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgQEVWRU5UX0NIQU5HRV9WSUVXICAgICA6ICdFVkVOVF9DSEFOR0VfVklFVydcbiAgICBARVZFTlRfQ0hBTkdFX1NVQl9WSUVXIDogJ0VWRU5UX0NIQU5HRV9TVUJfVklFVydcblxuICAgIHNlY3Rpb25zIDpcbiAgICAgICAgSE9NRSAgICAgICA6ICcnXG4gICAgICAgIEFCT1VUICAgICAgOiAnYWJvdXQnXG4gICAgICAgIENPTlRSSUJVVEUgOiAnY29udHJpYnV0ZSdcbiAgICAgICAgRE9PRExFUyAgICA6ICdfJ1xuXG4gICAgY3VycmVudCAgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbFxuICAgIHByZXZpb3VzIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAY2hhbmdlVmlld1xuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZ2V0U2VjdGlvbiA6IChzZWN0aW9uKSA9PlxuXG4gICAgICAgIGlmIHNlY3Rpb24gaXMgJycgdGhlbiByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIGZvciBzZWN0aW9uTmFtZSwgdXJpIG9mIEBzZWN0aW9uc1xuICAgICAgICAgICAgaWYgdXJpIGlzIHNlY3Rpb24gdGhlbiByZXR1cm4gc2VjdGlvbk5hbWVcblxuICAgICAgICBmYWxzZVxuXG4gICAgY2hhbmdlVmlldzogKGFyZWEsIHN1YiwgcGFyYW1zKSA9PlxuXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJhcmVhXCIsYXJlYVxuICAgICAgICAjIGNvbnNvbGUubG9nIFwic3ViXCIsc3ViXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJwYXJhbXNcIixwYXJhbXNcblxuICAgICAgICBAcHJldmlvdXMgPSBAY3VycmVudFxuICAgICAgICBAY3VycmVudCAgPSBhcmVhIDogYXJlYSwgc3ViIDogc3ViXG5cbiAgICAgICAgaWYgQHByZXZpb3VzLmFyZWEgYW5kIEBwcmV2aW91cy5hcmVhIGlzIEBjdXJyZW50LmFyZWFcbiAgICAgICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjdXJyZW50XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfVklFVywgQHByZXZpb3VzLCBAY3VycmVudFxuICAgICAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGN1cnJlbnRcblxuICAgICAgICBpZiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5pc09wZW4oKSB0aGVuIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmhpZGVPcGVuTW9kYWwoKVxuXG4gICAgICAgIEBzZXRQYWdlVGl0bGUgYXJlYSwgc3ViXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZVRpdGxlOiAoYXJlYSwgc3ViKSA9PlxuXG4gICAgICAgIHRpdGxlID0gXCJQQUdFIFRJVExFIEhFUkUgLSBMT0NBTElTRSBCQVNFRCBPTiBVUkxcIlxuXG4gICAgICAgIGlmIHdpbmRvdy5kb2N1bWVudC50aXRsZSBpc250IHRpdGxlIHRoZW4gd2luZG93LmRvY3VtZW50LnRpdGxlID0gdGl0bGVcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTmF2XG4iLCJjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuICAgIEBFVkVOVF9IQVNIX0NIQU5HRUQgOiAnRVZFTlRfSEFTSF9DSEFOR0VEJ1xuXG4gICAgRklSU1RfUk9VVEUgOiB0cnVlXG5cbiAgICByb3V0ZXMgOlxuICAgICAgICAnKC8pKDphcmVhKSgvOnN1YikoLyknIDogJ2hhc2hDaGFuZ2VkJ1xuICAgICAgICAnKmFjdGlvbnMnICAgICAgICAgICAgIDogJ25hdmlnYXRlVG8nXG5cbiAgICBhcmVhICAgOiBudWxsXG4gICAgc3ViICAgIDogbnVsbFxuICAgIHBhcmFtcyA6IG51bGxcblxuICAgIHN0YXJ0IDogPT5cblxuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0IFxuICAgICAgICAgICAgcHVzaFN0YXRlIDogdHJ1ZVxuICAgICAgICAgICAgcm9vdCAgICAgIDogJy8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaGFzaENoYW5nZWQgOiAoQGFyZWEgPSBudWxsLCBAc3ViID0gbnVsbCkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIj4+IEVWRU5UX0hBU0hfQ0hBTkdFRCBAYXJlYSA9ICN7QGFyZWF9LCBAc3ViID0gI3tAc3VifSA8PFwiXG5cbiAgICAgICAgaWYgQEZJUlNUX1JPVVRFIHRoZW4gQEZJUlNUX1JPVVRFID0gZmFsc2VcblxuICAgICAgICBpZiAhQGFyZWEgdGhlbiBAYXJlYSA9IEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cbiAgICAgICAgQHRyaWdnZXIgUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGFyZWEsIEBzdWIsIEBwYXJhbXNcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvIDogKHdoZXJlID0gJycsIHRyaWdnZXIgPSB0cnVlLCByZXBsYWNlID0gZmFsc2UsIEBwYXJhbXMpID0+XG5cbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KDApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIvI3t3aGVyZX1cIlxuICAgICAgICBpZiB3aGVyZS5jaGFyQXQoIHdoZXJlLmxlbmd0aC0xICkgaXNudCBcIi9cIlxuICAgICAgICAgICAgd2hlcmUgPSBcIiN7d2hlcmV9L1wiXG5cbiAgICAgICAgaWYgIXRyaWdnZXJcbiAgICAgICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIHdoZXJlLCBudWxsLCBAcGFyYW1zXG4gICAgICAgICAgICByZXR1cm5cblxuICAgICAgICBAbmF2aWdhdGUgd2hlcmUsIHRyaWdnZXI6IHRydWUsIHJlcGxhY2U6IHJlcGxhY2VcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlclxuIiwiIyMjXG5BbmFseXRpY3Mgd3JhcHBlclxuIyMjXG5jbGFzcyBBbmFseXRpY3NcblxuICAgIHRhZ3MgICAgOiBudWxsXG4gICAgc3RhcnRlZCA6IGZhbHNlXG5cbiAgICBhdHRlbXB0cyAgICAgICAgOiAwXG4gICAgYWxsb3dlZEF0dGVtcHRzIDogNVxuXG4gICAgY29uc3RydWN0b3IgOiAodGFncywgQGNhbGxiYWNrKSAtPlxuXG4gICAgICAgICQuZ2V0SlNPTiB0YWdzLCBAb25UYWdzUmVjZWl2ZWRcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgb25UYWdzUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBAdGFncyAgICA9IGRhdGFcbiAgICAgICAgQHN0YXJ0ZWQgPSB0cnVlXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgICMjI1xuICAgIEBwYXJhbSBzdHJpbmcgaWQgb2YgdGhlIHRyYWNraW5nIHRhZyB0byBiZSBwdXNoZWQgb24gQW5hbHl0aWNzIFxuICAgICMjI1xuICAgIHRyYWNrIDogKHBhcmFtKSA9PlxuXG4gICAgICAgIHJldHVybiBpZiAhQHN0YXJ0ZWRcblxuICAgICAgICBpZiBwYXJhbVxuXG4gICAgICAgICAgICB2ID0gQHRhZ3NbcGFyYW1dXG5cbiAgICAgICAgICAgIGlmIHZcblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3NlbmQnLCAnZXZlbnQnXVxuICAgICAgICAgICAgICAgICggYXJncy5wdXNoKGFyZykgKSBmb3IgYXJnIGluIHZcblxuICAgICAgICAgICAgICAgICMgbG9hZGluZyBHQSBhZnRlciBtYWluIGFwcCBKUywgc28gZXh0ZXJuYWwgc2NyaXB0IG1heSBub3QgYmUgaGVyZSB5ZXRcbiAgICAgICAgICAgICAgICBpZiB3aW5kb3cuZ2FcbiAgICAgICAgICAgICAgICAgICAgZ2EuYXBwbHkgbnVsbCwgYXJnc1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgQGF0dGVtcHRzID49IEBhbGxvd2VkQXR0ZW1wdHNcbiAgICAgICAgICAgICAgICAgICAgQHN0YXJ0ZWQgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgQHRyYWNrIHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICAgICBAYXR0ZW1wdHMrK1xuICAgICAgICAgICAgICAgICAgICAsIDIwMDBcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQW5hbHl0aWNzXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcbkZhY2Vib29rICAgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi4vdXRpbHMvR29vZ2xlUGx1cydcblxuY2xhc3MgQXV0aE1hbmFnZXIgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHR1c2VyRGF0YSAgOiBudWxsXG5cblx0IyBAcHJvY2VzcyB0cnVlIGR1cmluZyBsb2dpbiBwcm9jZXNzXG5cdHByb2Nlc3MgICAgICA6IGZhbHNlXG5cdHByb2Nlc3NUaW1lciA6IG51bGxcblx0cHJvY2Vzc1dhaXQgIDogNTAwMFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB1c2VyRGF0YSAgPSBAQ0QoKS5hcHBEYXRhLlVTRVJcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0bG9naW4gOiAoc2VydmljZSwgY2I9bnVsbCkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCIrKysrIFBST0NFU1MgXCIsQHByb2Nlc3NcblxuXHRcdHJldHVybiBpZiBAcHJvY2Vzc1xuXG5cdFx0QHNob3dMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gdHJ1ZVxuXG5cdFx0JGRhdGFEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdHN3aXRjaCBzZXJ2aWNlXG5cdFx0XHR3aGVuICdnb29nbGUnXG5cdFx0XHRcdEdvb2dsZVBsdXMubG9naW4gJGRhdGFEZmRcblx0XHRcdHdoZW4gJ2ZhY2Vib29rJ1xuXHRcdFx0XHRGYWNlYm9vay5sb2dpbiAkZGF0YURmZFxuXG5cdFx0JGRhdGFEZmQuZG9uZSAocmVzKSA9PiBAYXV0aFN1Y2Nlc3Mgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuZmFpbCAocmVzKSA9PiBAYXV0aEZhaWwgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuYWx3YXlzICgpID0+IEBhdXRoQ2FsbGJhY2sgY2JcblxuXHRcdCMjI1xuXHRcdFVuZm9ydHVuYXRlbHkgbm8gY2FsbGJhY2sgaXMgZmlyZWQgaWYgdXNlciBtYW51YWxseSBjbG9zZXMgRysgbG9naW4gbW9kYWwsXG5cdFx0c28gdGhpcyBpcyB0byBhbGxvdyB0aGVtIHRvIGNsb3NlIHdpbmRvdyBhbmQgdGhlbiBzdWJzZXF1ZW50bHkgdHJ5IHRvIGxvZyBpbiBhZ2Fpbi4uLlxuXHRcdCMjI1xuXHRcdEBwcm9jZXNzVGltZXIgPSBzZXRUaW1lb3V0IEBhdXRoQ2FsbGJhY2ssIEBwcm9jZXNzV2FpdFxuXG5cdFx0JGRhdGFEZmRcblxuXHRhdXRoU3VjY2VzcyA6IChzZXJ2aWNlLCBkYXRhKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImxvZ2luIGNhbGxiYWNrIGZvciAje3NlcnZpY2V9LCBkYXRhID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aEZhaWwgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBmYWlsIGZvciAje3NlcnZpY2V9ID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aENhbGxiYWNrIDogKGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBwcm9jZXNzXG5cblx0XHRjbGVhclRpbWVvdXQgQHByb2Nlc3NUaW1lclxuXG5cdFx0QGhpZGVMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gZmFsc2VcblxuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0IyMjXG5cdHNob3cgLyBoaWRlIHNvbWUgVUkgaW5kaWNhdG9yIHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIHNvY2lhbCBuZXR3b3JrIHRvIHJlc3BvbmRcblx0IyMjXG5cdHNob3dMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcInNob3dMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5cdGhpZGVMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImhpZGVMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhNYW5hZ2VyXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkZhY2Vib29rIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEZhY2Vib29rIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgICAgIDogJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvYWxsLmpzJ1xuXG5cdEBwZXJtaXNzaW9ucyA6ICdlbWFpbCdcblxuXHRAJGRhdGFEZmQgICAgOiBudWxsXG5cdEBsb2FkZWQgICAgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEZCLmluaXRcblx0XHRcdGFwcElkICA6IHdpbmRvdy5jb25maWcuZmJfYXBwX2lkXG5cdFx0XHRzdGF0dXMgOiBmYWxzZVxuXHRcdFx0eGZibWwgIDogZmFsc2VcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgIUBsb2FkZWQgdGhlbiByZXR1cm4gQCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRGQi5sb2dpbiAoIHJlcyApID0+XG5cblx0XHRcdGlmIHJlc1snc3RhdHVzJ10gaXMgJ2Nvbm5lY3RlZCdcblx0XHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYXV0aFJlc3BvbnNlJ11bJ2FjY2Vzc1Rva2VuJ11cblx0XHRcdGVsc2Vcblx0XHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHQsIHsgc2NvcGU6IEBwZXJtaXNzaW9ucyB9XG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0dXNlckRhdGEgPSB7fVxuXHRcdHVzZXJEYXRhLmFjY2Vzc190b2tlbiA9IHRva2VuXG5cblx0XHQkbWVEZmQgICA9ICQuRGVmZXJyZWQoKVxuXHRcdCRwaWNEZmQgID0gJC5EZWZlcnJlZCgpXG5cblx0XHRGQi5hcGkgJy9tZScsIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLmZ1bGxfbmFtZSA9IHJlcy5uYW1lXG5cdFx0XHR1c2VyRGF0YS5zb2NpYWxfaWQgPSByZXMuaWRcblx0XHRcdHVzZXJEYXRhLmVtYWlsICAgICA9IHJlcy5lbWFpbCBvciBmYWxzZVxuXHRcdFx0JG1lRGZkLnJlc29sdmUoKVxuXG5cdFx0RkIuYXBpICcvbWUvcGljdHVyZScsIHsgJ3dpZHRoJzogJzIwMCcgfSwgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEucHJvZmlsZV9waWMgPSByZXMuZGF0YS51cmxcblx0XHRcdCRwaWNEZmQucmVzb2x2ZSgpXG5cblx0XHQkLndoZW4oJG1lRGZkLCAkcGljRGZkKS5kb25lID0+IEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cblx0QHNoYXJlIDogKG9wdHMsIGNiKSA9PlxuXG5cdFx0RkIudWkge1xuXHRcdFx0bWV0aG9kICAgICAgOiBvcHRzLm1ldGhvZCBvciAnZmVlZCdcblx0XHRcdG5hbWUgICAgICAgIDogb3B0cy5uYW1lIG9yICcnXG5cdFx0XHRsaW5rICAgICAgICA6IG9wdHMubGluayBvciAnJ1xuXHRcdFx0cGljdHVyZSAgICAgOiBvcHRzLnBpY3R1cmUgb3IgJydcblx0XHRcdGNhcHRpb24gICAgIDogb3B0cy5jYXB0aW9uIG9yICcnXG5cdFx0XHRkZXNjcmlwdGlvbiA6IG9wdHMuZGVzY3JpcHRpb24gb3IgJydcblx0XHR9LCAocmVzcG9uc2UpIC0+XG5cdFx0XHRjYj8ocmVzcG9uc2UpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZWJvb2tcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuR29vZ2xlKyBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBHb29nbGVQbHVzIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgIDogJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudDpwbHVzb25lLmpzJ1xuXG5cdEBwYXJhbXMgICA6XG5cdFx0J2NsaWVudGlkJyAgICAgOiBudWxsXG5cdFx0J2NhbGxiYWNrJyAgICAgOiBudWxsXG5cdFx0J3Njb3BlJyAgICAgICAgOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5lbWFpbCdcblx0XHQnY29va2llcG9saWN5JyA6ICdub25lJ1xuXG5cdEAkZGF0YURmZCA6IG51bGxcblx0QGxvYWRlZCAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0QHBhcmFtc1snY2xpZW50aWQnXSA9IHdpbmRvdy5jb25maWcuZ3BfYXBwX2lkXG5cdFx0QHBhcmFtc1snY2FsbGJhY2snXSA9IEBsb2dpbkNhbGxiYWNrXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmIEBsb2FkZWRcblx0XHRcdGdhcGkuYXV0aC5zaWduSW4gQHBhcmFtc1xuXHRcdGVsc2Vcblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbkNhbGxiYWNrIDogKHJlcykgPT5cblxuXHRcdGlmIHJlc1snc3RhdHVzJ11bJ3NpZ25lZF9pbiddXG5cdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhY2Nlc3NfdG9rZW4nXVxuXHRcdGVsc2UgaWYgcmVzWydlcnJvciddWydhY2Nlc3NfZGVuaWVkJ11cblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdGdhcGkuY2xpZW50LmxvYWQgJ3BsdXMnLCd2MScsID0+XG5cblx0XHRcdHJlcXVlc3QgPSBnYXBpLmNsaWVudC5wbHVzLnBlb3BsZS5nZXQgJ3VzZXJJZCc6ICdtZSdcblx0XHRcdHJlcXVlc3QuZXhlY3V0ZSAocmVzKSA9PlxuXG5cdFx0XHRcdHVzZXJEYXRhID1cblx0XHRcdFx0XHRhY2Nlc3NfdG9rZW4gOiB0b2tlblxuXHRcdFx0XHRcdGZ1bGxfbmFtZSAgICA6IHJlcy5kaXNwbGF5TmFtZVxuXHRcdFx0XHRcdHNvY2lhbF9pZCAgICA6IHJlcy5pZFxuXHRcdFx0XHRcdGVtYWlsICAgICAgICA6IGlmIHJlcy5lbWFpbHNbMF0gdGhlbiByZXMuZW1haWxzWzBdLnZhbHVlIGVsc2UgZmFsc2Vcblx0XHRcdFx0XHRwcm9maWxlX3BpYyAgOiByZXMuaW1hZ2UudXJsXG5cblx0XHRcdFx0QCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVQbHVzXG4iLCIjICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgTWVkaWEgUXVlcmllcyBNYW5hZ2VyIFxuIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIFxuIyAgIEBhdXRob3IgOiBGw6FiaW8gQXpldmVkbyA8ZmFiaW8uYXpldmVkb0B1bml0OS5jb20+IFVOSVQ5XG4jICAgQGRhdGUgICA6IFNlcHRlbWJlciAxNFxuIyAgIFxuIyAgIEluc3RydWN0aW9ucyBhcmUgb24gL3Byb2plY3Qvc2Fzcy91dGlscy9fcmVzcG9uc2l2ZS5zY3NzLlxuXG5jbGFzcyBNZWRpYVF1ZXJpZXNcblxuICAgICMgQnJlYWtwb2ludHNcbiAgICBAU01BTEwgICAgICAgOiBcInNtYWxsXCJcbiAgICBASVBBRCAgICAgICAgOiBcImlwYWRcIlxuICAgIEBNRURJVU0gICAgICA6IFwibWVkaXVtXCJcbiAgICBATEFSR0UgICAgICAgOiBcImxhcmdlXCJcbiAgICBARVhUUkFfTEFSR0UgOiBcImV4dHJhLWxhcmdlXCJcblxuICAgIEBzZXR1cCA6ID0+XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiU21hbGxcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuU01BTExdfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlQgPSB7bmFtZTogXCJNZWRpdW1cIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuTUVESVVNXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiTGFyZ2VcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuSVBBRCwgTWVkaWFRdWVyaWVzLkxBUkdFLCBNZWRpYVF1ZXJpZXMuRVhUUkFfTEFSR0VdfVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUyA9IFtcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UXG4gICAgICAgIF1cbiAgICAgICAgcmV0dXJuXG5cbiAgICBAZ2V0RGV2aWNlU3RhdGUgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBcImFmdGVyXCIpLmdldFByb3BlcnR5VmFsdWUoXCJjb250ZW50XCIpO1xuXG4gICAgQGdldEJyZWFrcG9pbnQgOiA9PlxuXG4gICAgICAgIHN0YXRlID0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcblxuICAgICAgICBmb3IgaSBpbiBbMC4uLk1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUy5sZW5ndGhdXG4gICAgICAgICAgICBpZiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0uYnJlYWtwb2ludHMuaW5kZXhPZihzdGF0ZSkgPiAtMVxuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0ubmFtZVxuXG4gICAgICAgIHJldHVybiBcIlwiXG5cbiAgICBAaXNCcmVha3BvaW50IDogKGJyZWFrcG9pbnQpID0+XG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5icmVha3BvaW50LmJyZWFrcG9pbnRzLmxlbmd0aF1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYnJlYWtwb2ludC5icmVha3BvaW50c1tpXSA9PSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFRdWVyaWVzIiwiIyMjXG4jIFJlcXVlc3RlciAjXG5cbldyYXBwZXIgZm9yIGAkLmFqYXhgIGNhbGxzXG5cbiMjI1xuY2xhc3MgUmVxdWVzdGVyXG5cbiAgICBAcmVxdWVzdHMgOiBbXVxuXG4gICAgQHJlcXVlc3Q6ICggZGF0YSApID0+XG4gICAgICAgICMjI1xuICAgICAgICBgZGF0YSA9IHtgPGJyPlxuICAgICAgICBgICB1cmwgICAgICAgICA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGAgIHR5cGUgICAgICAgIDogXCJQT1NUL0dFVC9QVVRcImA8YnI+XG4gICAgICAgIGAgIGRhdGEgICAgICAgIDogT2JqZWN0YDxicj5cbiAgICAgICAgYCAgZGF0YVR5cGUgICAgOiBqUXVlcnkgZGF0YVR5cGVgPGJyPlxuICAgICAgICBgICBjb250ZW50VHlwZSA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGB9YFxuICAgICAgICAjIyNcblxuICAgICAgICByID0gJC5hamF4IHtcblxuICAgICAgICAgICAgdXJsICAgICAgICAgOiBkYXRhLnVybFxuICAgICAgICAgICAgdHlwZSAgICAgICAgOiBpZiBkYXRhLnR5cGUgdGhlbiBkYXRhLnR5cGUgZWxzZSBcIlBPU1RcIixcbiAgICAgICAgICAgIGRhdGEgICAgICAgIDogaWYgZGF0YS5kYXRhIHRoZW4gZGF0YS5kYXRhIGVsc2UgbnVsbCxcbiAgICAgICAgICAgIGRhdGFUeXBlICAgIDogaWYgZGF0YS5kYXRhVHlwZSB0aGVuIGRhdGEuZGF0YVR5cGUgZWxzZSBcImpzb25cIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogaWYgZGF0YS5jb250ZW50VHlwZSB0aGVuIGRhdGEuY29udGVudFR5cGUgZWxzZSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGEgOiBpZiBkYXRhLnByb2Nlc3NEYXRhICE9IG51bGwgYW5kIGRhdGEucHJvY2Vzc0RhdGEgIT0gdW5kZWZpbmVkIHRoZW4gZGF0YS5wcm9jZXNzRGF0YSBlbHNlIHRydWVcblxuICAgICAgICB9XG5cbiAgICAgICAgci5kb25lIGRhdGEuZG9uZVxuICAgICAgICByLmZhaWwgZGF0YS5mYWlsXG4gICAgICAgIFxuICAgICAgICByXG5cbiAgICBAYWRkSW1hZ2UgOiAoZGF0YSwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgIyMjXG4gICAgICAgICoqIFVzYWdlOiA8YnI+XG4gICAgICAgIGBkYXRhID0gY2FudmFzcy50b0RhdGFVUkwoXCJpbWFnZS9qcGVnXCIpLnNsaWNlKFwiZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCxcIi5sZW5ndGgpYDxicj5cbiAgICAgICAgYFJlcXVlc3Rlci5hZGRJbWFnZSBkYXRhLCBcInpvZXRyb3BlXCIsIEBkb25lLCBAZmFpbGBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nXG4gICAgICAgICAgICB0eXBlICAgOiAnUE9TVCdcbiAgICAgICAgICAgIGRhdGEgICA6IHtpbWFnZV9iYXNlNjQgOiBlbmNvZGVVUkkoZGF0YSl9XG4gICAgICAgICAgICBkb25lICAgOiBkb25lXG4gICAgICAgICAgICBmYWlsICAgOiBmYWlsXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQGRlbGV0ZUltYWdlIDogKGlkLCBkb25lLCBmYWlsKSA9PlxuICAgICAgICBcbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nK2lkXG4gICAgICAgICAgICB0eXBlICAgOiAnREVMRVRFJ1xuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0ZXJcbiIsIiMjI1xuU2hhcmluZyBjbGFzcyBmb3Igbm9uLVNESyBsb2FkZWQgc29jaWFsIG5ldHdvcmtzLlxuSWYgU0RLIGlzIGxvYWRlZCwgYW5kIHByb3ZpZGVzIHNoYXJlIG1ldGhvZHMsIHRoZW4gdXNlIHRoYXQgY2xhc3MgaW5zdGVhZCwgZWcuIGBGYWNlYm9vay5zaGFyZWAgaW5zdGVhZCBvZiBgU2hhcmUuZmFjZWJvb2tgXG4jIyNcbmNsYXNzIFNoYXJlXG5cbiAgICB1cmwgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IC0+XG5cbiAgICAgICAgQHVybCA9IEBDRCgpLkJBU0VfUEFUSFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvcGVuV2luIDogKHVybCwgdywgaCkgPT5cblxuICAgICAgICBsZWZ0ID0gKCBzY3JlZW4uYXZhaWxXaWR0aCAgLSB3ICkgPj4gMVxuICAgICAgICB0b3AgID0gKCBzY3JlZW4uYXZhaWxIZWlnaHQgLSBoICkgPj4gMVxuXG4gICAgICAgIHdpbmRvdy5vcGVuIHVybCwgJycsICd0b3A9Jyt0b3ArJyxsZWZ0PScrbGVmdCsnLHdpZHRoPScrdysnLGhlaWdodD0nK2grJyxsb2NhdGlvbj1ubyxtZW51YmFyPW5vJ1xuXG4gICAgICAgIG51bGxcblxuICAgIHBsdXMgOiAoIHVybCApID0+XG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vc2hhcmU/dXJsPSN7dXJsfVwiLCA2NTAsIDM4NVxuXG4gICAgICAgIG51bGxcblxuICAgIHBpbnRlcmVzdCA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9I3t1cmx9Jm1lZGlhPSN7bWVkaWF9JmRlc2NyaXB0aW9uPSN7ZGVzY3J9XCIsIDczNSwgMzEwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHVtYmxyIDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnR1bWJsci5jb20vc2hhcmUvcGhvdG8/c291cmNlPSN7bWVkaWF9JmNhcHRpb249I3tkZXNjcn0mY2xpY2tfdGhydT0je3VybH1cIiwgNDUwLCA0MzBcblxuICAgICAgICBudWxsXG5cbiAgICBmYWNlYm9vayA6ICggdXJsICwgY29weSA9ICcnKSA9PiBcblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgZGVjc3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlLnBocD91PSN7dXJsfSZ0PSN7ZGVjc3J9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHdpdHRlciA6ICggdXJsICwgY29weSA9ICcnKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHQjIyNcblx0XHRvdmVycmlkZSBvbiBwZXIgdmlldyBiYXNpcyAtIHVuYmluZCBldmVudCBoYW5kbGVycyBldGNcblx0XHQjIyNcblxuXHRcdG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RWaWV3UGFnZSBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdF9zaG93biAgICAgOiBmYWxzZVxuXHRfbGlzdGVuaW5nIDogZmFsc2VcblxuXHRzaG93IDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyAhQF9zaG93blxuXHRcdEBfc2hvd24gPSB0cnVlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIuYWRkQ2hpbGQgQFxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb24nXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICd2aXNpYmxlJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgQF9zaG93blxuXHRcdEBfc2hvd24gPSBmYWxzZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLnJlbW92ZSBAXG5cblx0XHQjIEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAnaGlkZGVuJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29mZidcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHJldHVybiB1bmxlc3Mgc2V0dGluZyBpc250IEBfbGlzdGVuaW5nXG5cdFx0QF9saXN0ZW5pbmcgPSBzZXR0aW5nXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3UGFnZVxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIEFib3V0UGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1hYm91dCdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dFBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEZvb3RlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnc2l0ZS1mb290ZXInXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0ge31cblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGb290ZXJcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblJvdXRlciA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9Sb3V0ZXInXG5cbmNsYXNzIEhlYWRlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdHRlbXBsYXRlIDogJ3NpdGUtaGVhZGVyJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPVxuXHRcdFx0aG9tZSAgICA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9sb2dvX2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1BBVEggKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0YWJvdXQgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfYWJvdXRfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfUEFUSCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5BQk9VVFxuXHRcdFx0Y29udHJpYnV0ZSA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9jb250cmlidXRlX2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1BBVEggKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Y2xvc2VfbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY2xvc2VfbGFiZWwnKVxuXHRcdFx0aW5mb19sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9pbmZvX2xhYmVsJylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0YmluZEV2ZW50cyA6ID0+XG5cblx0XHRAQ0QoKS5yb3V0ZXIub24gUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQG9uSGFzaENoYW5nZVxuXG5cdFx0bnVsbFxuXG5cdG9uSGFzaENoYW5nZSA6ICh3aGVyZSkgPT5cblxuXHRcdHdoZXJlID0gd2hlcmUgb3IgJ2hvbWUnXG5cdFx0QCRlbC5hdHRyICdkYXRhLXNlY3Rpb24nLCB3aGVyZVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlclxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuXG5jbGFzcyBQcmVsb2FkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblx0XG5cdGNiICAgICAgICAgICAgICA6IG51bGxcblx0XG5cdFRSQU5TSVRJT05fVElNRSA6IDAuNVxuXG5cdE1JTl9XUk9OR19DSEFSUyA6IDBcblx0TUFYX1dST05HX0NIQVJTIDogNFxuXG5cdE1JTl9DSEFSX0lOX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfSU5fREVMQVkgOiAxMDBcblxuXHRNSU5fQ0hBUl9PVVRfREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9PVVRfREVMQVkgOiAxMDBcblxuXHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHNldEVsZW1lbnQgJCgnI3ByZWxvYWRlcicpXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QHNldHVwQ2hhcnMoKVxuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiAoQGNiKSA9PlxuXG5cdFx0Y29uc29sZS5sb2cgXCJzaG93IDogKEBjYikgPT5cIlxuXG5cdFx0QCRlbC5hZGRDbGFzcygnc2hvdy1wcmVsb2FkZXInKVxuXG5cdFx0QGFuaW1hdGVDaGFyc0luIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25TaG93Q29tcGxldGUgOiA9PlxuXG5cdFx0QGNiPygpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChAY2IpID0+XG5cblx0XHRAYW5pbWF0ZUNoYXJzT3V0IEBvbkhpZGVDb21wbGV0ZVxuXG5cdFx0bnVsbFxuXG5cdG9uSGlkZUNvbXBsZXRlIDogPT5cblxuXHRcdEAkZWwucmVtb3ZlQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxuXHRzZXR1cENoYXJzIDogPT5cblxuXHRcdEBjaGFycyA9IFtdXG5cdFx0XG5cdFx0QCRlbC5maW5kKCdbZGF0YS1jb2RldGV4dC1jaGFyXScpLmVhY2ggKGksIGVsKSA9PlxuXG5cdFx0XHQkZWwgPSAkKGVsKVxuXG5cdFx0XHRAY2hhcnMucHVzaFxuXHRcdFx0XHQkZWwgICAgICAgIDogJGVsXG5cdFx0XHRcdHJpZ2h0Q2hhciAgOiAkZWwuYXR0cignZGF0YS1jb2RldGV4dC1jaGFyJylcblx0XHRcdFx0d3JvbmdDaGFycyA6IEBfZ2V0UmFuZG9tV3JvbmdDaGFycygpXG5cblx0XHRudWxsXG5cblx0X2dldFJhbmRvbVdyb25nQ2hhcnMgOiA9PlxuXG5cdFx0Y2hhcnMgPSBbXVxuXG5cdFx0Y2hhckNvdW50ID0gXy5yYW5kb20gQE1JTl9XUk9OR19DSEFSUywgQE1BWF9XUk9OR19DSEFSU1xuXG5cdFx0Zm9yIGkgaW4gWzAuLi5jaGFyQ291bnRdXG5cdFx0XHRjaGFycy5wdXNoXG5cdFx0XHRcdGNoYXIgICAgIDogQF9nZXRSYW5kb21DaGFyKClcblx0XHRcdFx0aW5EZWxheSAgOiBfLnJhbmRvbSBATUlOX0NIQVJfSU5fREVMQVksIEBNQVhfQ0hBUl9JTl9ERUxBWVxuXHRcdFx0XHRvdXREZWxheSA6IF8ucmFuZG9tIEBNSU5fQ0hBUl9PVVRfREVMQVksIEBNQVhfQ0hBUl9PVVRfREVMQVlcblxuXHRcdGNoYXJzXG5cblx0X2dldFJhbmRvbUNoYXIgOiA9PlxuXG5cdFx0Y2hhciA9IEBDSEFSU1sgXy5yYW5kb20oMCwgQENIQVJTLmxlbmd0aC0xKSBdXG5cblx0XHRjaGFyXG5cblx0YW5pbWF0ZUNoYXJzSW4gOiAoY2IpID0+XG5cblx0XHRhY3RpdmVDaGFyID0gMFxuXG5cdFx0QF9hbmltYXRlQ2hhckluIGFjdGl2ZUNoYXIsIGNiXG5cblx0XHRudWxsXG5cblx0X2FuaW1hdGVDaGFySW4gOiAoaWR4LCBjYikgPT5cblxuXHRcdGNoYXIgPSBAY2hhcnNbaWR4XVxuXG5cdFx0QF9hbmltYXRlV3JvbmdDaGFyc0luIGNoYXIsID0+XG5cblx0XHRcdGlmIGlkeCBpcyBAY2hhcnMubGVuZ3RoLTFcblx0XHRcdFx0QGFuaW1hdGVDaGFyc0luRG9uZSBjYlxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAX2FuaW1hdGVDaGFySW4gaWR4KzEsIGNiXG5cblx0XHRudWxsXG5cblx0X2FuaW1hdGVXcm9uZ0NoYXJzSW4gOiAoY2hhciwgY2IpID0+XG5cblx0XHRpZiBjaGFyLndyb25nQ2hhcnMubGVuZ3RoXG5cblx0XHRcdHdyb25nQ2hhciA9IGNoYXIud3JvbmdDaGFycy5zaGlmdCgpXG5cblx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0Y2hhci4kZWwuaHRtbCB3cm9uZ0NoYXIuY2hhclxuXG5cdFx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0XHQjIGNoYXIuJGVsLmh0bWwgJydcblx0XHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzSW4gY2hhciwgY2Jcblx0XHRcdFx0LCB3cm9uZ0NoYXIub3V0RGVsYXlcblxuXHRcdFx0LCB3cm9uZ0NoYXIuaW5EZWxheVxuXG5cdFx0ZWxzZVxuXG5cdFx0XHRjaGFyLiRlbC5odG1sIGNoYXIucmlnaHRDaGFyXG5cdFx0XHRjYigpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUNoYXJzSW5Eb25lIDogKGNiKSA9PlxuXG5cdFx0Y29uc29sZS5sb2cgXCJhbmltYXRlQ2hhcnNJbkRvbmUgOiA9PlwiXG5cblx0XHRjYigpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUNoYXJzT3V0IDogKGNiKSA9PlxuXG5cdFx0Zm9yIGNoYXIgaW4gQGNoYXJzXG5cblx0XHRcdGNoYXIuJGVsLmFkZENsYXNzKCdoaWRlLWJvcmRlcicpXG5cblx0XHRcdGRpc3BsYWNlbWVudCA9IF8ucmFuZG9tKDIwLCA4MClcblx0XHRcdHJvdGF0aW9uICAgICA9IChkaXNwbGFjZW1lbnQgLyA4MCkgKiAxMDBcblx0XHRcdHJvdGF0aW9uICAgICA9IGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB0aGVuIHJvdGF0aW9uIGVsc2UgLXJvdGF0aW9uXG5cblx0XHRcdFR3ZWVuTGl0ZS50byBjaGFyLiRlbCwgMSwgeyBkZWxheSA6IDErKChfLnJhbmRvbSg1MCwgMjAwKSkvMTAwMCksIG9wYWNpdHk6IDAsIHkgOiBkaXNwbGFjZW1lbnQsIHJvdGF0aW9uOiBcIiN7cm90YXRpb259ZGVnXCIsIGVhc2U6IEN1YmljLmVhc2VJbiB9XG5cblx0XHRzZXRUaW1lb3V0IGNiLCAyMjAwXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUHJlbG9hZGVyXG4iLCJBYnN0cmFjdFZpZXcgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Ib21lVmlldyAgICAgICAgICAgPSByZXF1aXJlICcuLi9ob21lL0hvbWVWaWV3J1xuQWJvdXRQYWdlVmlldyAgICAgID0gcmVxdWlyZSAnLi4vYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcnXG5Db250cmlidXRlUGFnZVZpZXcgPSByZXF1aXJlICcuLi9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcnXG5OYXYgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvTmF2J1xuXG5jbGFzcyBXcmFwcGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0VklFV19UWVBFX1BBR0UgIDogJ3BhZ2UnXG5cdFZJRVdfVFlQRV9NT0RBTCA6ICdtb2RhbCdcblxuXHR0ZW1wbGF0ZSA6ICd3cmFwcGVyJ1xuXG5cdHZpZXdzICAgICAgICAgIDogbnVsbFxuXHRwcmV2aW91c1ZpZXcgICA6IG51bGxcblx0Y3VycmVudFZpZXcgICAgOiBudWxsXG5cdGJhY2tncm91bmRWaWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB2aWV3cyA9XG5cdFx0XHRob21lICAgICAgIDogY2xhc3NSZWYgOiBIb21lVmlldywgICAgICAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkhPTUUsICAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRhYm91dCAgICAgIDogY2xhc3NSZWYgOiBBYm91dFBhZ2VWaWV3LCAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VULCAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRjb250cmlidXRlIDogY2xhc3NSZWYgOiBDb250cmlidXRlUGFnZVZpZXcsIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEUsIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cblx0XHRAY3JlYXRlQ2xhc3NlcygpXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIGRlY2lkZSBpZiB5b3Ugd2FudCB0byBhZGQgYWxsIGNvcmUgRE9NIHVwIGZyb250LCBvciBhZGQgb25seSB3aGVuIHJlcXVpcmVkLCBzZWUgY29tbWVudHMgaW4gQWJzdHJhY3RWaWV3UGFnZS5jb2ZmZWVcblx0XHQjIEBhZGRDbGFzc2VzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Y3JlYXRlQ2xhc3NlcyA6ID0+XG5cblx0XHQoQHZpZXdzW25hbWVdLnZpZXcgPSBuZXcgQHZpZXdzW25hbWVdLmNsYXNzUmVmKSBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3NcblxuXHRcdG51bGxcblxuXHRhZGRDbGFzc2VzIDogPT5cblxuXHRcdCBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHQgXHRpZiBkYXRhLnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIHRoZW4gQGFkZENoaWxkIGRhdGEudmlld1xuXG5cdFx0bnVsbFxuXG5cdGdldFZpZXdCeVJvdXRlIDogKHJvdXRlKSA9PlxuXG5cdFx0Zm9yIG5hbWUsIGRhdGEgb2YgQHZpZXdzXG5cdFx0XHRyZXR1cm4gQHZpZXdzW25hbWVdIGlmIHJvdXRlIGlzIEB2aWV3c1tuYW1lXS5yb3V0ZVxuXG5cdFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdG51bGxcblxuXHRzdGFydCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9mZiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdG51bGxcblxuXHRiaW5kRXZlbnRzIDogPT5cblxuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBjaGFuZ2VWaWV3XG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjaGFuZ2VTdWJWaWV3XG5cblx0XHRudWxsXG5cblx0IyMjXG5cblx0VEhJUyBJUyBBIE1FU1MsIFNPUlQgSVQgKG5laWwpXG5cblx0IyMjXG5cdGNoYW5nZVZpZXcgOiAocHJldmlvdXMsIGN1cnJlbnQpID0+XG5cblx0XHRAcHJldmlvdXNWaWV3ID0gQGdldFZpZXdCeVJvdXRlIHByZXZpb3VzLmFyZWFcblx0XHRAY3VycmVudFZpZXcgID0gQGdldFZpZXdCeVJvdXRlIGN1cnJlbnQuYXJlYVxuXG5cdFx0aWYgIUBwcmV2aW91c1ZpZXdcblxuXHRcdFx0aWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgZmFsc2UsIEBjdXJyZW50Vmlldy52aWV3XG5cdFx0XHRlbHNlIGlmIEBjdXJyZW50Vmlldy50eXBlIGlzIEBWSUVXX1RZUEVfTU9EQUxcblx0XHRcdFx0QGJhY2tncm91bmRWaWV3ID0gQHZpZXdzLmhvbWVcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3LnZpZXcsIHRydWVcblxuXHRcdGVsc2VcblxuXHRcdFx0aWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldy52aWV3LCBAY3VycmVudFZpZXcudmlld1xuXHRcdFx0ZWxzZSBpZiBAY3VycmVudFZpZXcudHlwZSBpcyBAVklFV19UWVBFX01PREFMIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRcdEBiYWNrZ3JvdW5kVmlldyA9IEBwcmV2aW91c1ZpZXdcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3LnZpZXcsIHRydWVcblx0XHRcdGVsc2UgaWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9NT0RBTFxuXHRcdFx0XHRAYmFja2dyb3VuZFZpZXcgPSBAYmFja2dyb3VuZFZpZXcgb3IgQHZpZXdzLmhvbWVcblx0XHRcdFx0aWYgQGJhY2tncm91bmRWaWV3IGlzbnQgQGN1cnJlbnRWaWV3XG5cdFx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LnZpZXcsIEBjdXJyZW50Vmlldy52aWV3LCBmYWxzZSwgdHJ1ZVxuXHRcdFx0XHRlbHNlIGlmIEBiYWNrZ3JvdW5kVmlldyBpcyBAY3VycmVudFZpZXdcblx0XHRcdFx0XHRAdHJhbnNpdGlvblZpZXdzIEBwcmV2aW91c1ZpZXcudmlldywgZmFsc2Vcblx0XHRcdGVsc2UgaWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9NT0RBTCBhbmQgQHByZXZpb3VzVmlldy50eXBlIGlzIEBWSUVXX1RZUEVfTU9EQUxcblx0XHRcdFx0QGJhY2tncm91bmRWaWV3ID0gQGJhY2tncm91bmRWaWV3IG9yIEB2aWV3cy5ob21lXG5cdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldy52aWV3LCBAY3VycmVudFZpZXcudmlldywgdHJ1ZVxuXG5cdFx0bnVsbFxuXG5cdGNoYW5nZVN1YlZpZXcgOiAoY3VycmVudCkgPT5cblxuXHRcdEBjdXJyZW50Vmlldy52aWV3LnRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgY3VycmVudC5zdWJcblxuXHRcdG51bGxcblxuXHR0cmFuc2l0aW9uVmlld3MgOiAoZnJvbSwgdG8sIHRvTW9kYWw9ZmFsc2UsIGZyb21Nb2RhbD1mYWxzZSkgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgZnJvbSBpc250IHRvXG5cblx0XHRpZiB0b01vZGFsIHRoZW4gQGJhY2tncm91bmRWaWV3LnZpZXc/LnNob3coKVxuXHRcdGlmIGZyb21Nb2RhbCB0aGVuIEBiYWNrZ3JvdW5kVmlldy52aWV3Py5oaWRlKClcblxuXHRcdGlmIGZyb20gYW5kIHRvXG5cdFx0XHRmcm9tLmhpZGUgdG8uc2hvd1xuXHRcdGVsc2UgaWYgZnJvbVxuXHRcdFx0ZnJvbS5oaWRlKClcblx0XHRlbHNlIGlmIHRvXG5cdFx0XHR0by5zaG93KClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBXcmFwcGVyXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgQ29udHJpYnV0ZVBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtY29udHJpYnV0ZSdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImNvbnRyaWJ1dGVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyaWJ1dGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtaG9tZSdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImhvbWVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBFeGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWVWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0TW9kYWwgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHQkd2luZG93IDogbnVsbFxuXG5cdCMjIyBvdmVycmlkZSBpbiBpbmRpdmlkdWFsIGNsYXNzZXMgIyMjXG5cdG5hbWUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZSA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAJHdpbmRvdyA9ICQod2luZG93KVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QENEKCkuYXBwVmlldy5hZGRDaGlsZCBAXG5cdFx0QHNldExpc3RlbmVycyAnb24nXG5cdFx0QGFuaW1hdGVJbigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgPT4gQENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXG5cdFx0bnVsbFxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0QHNldExpc3RlbmVycyAnb2ZmJ1xuXHRcdEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLm1vZGFsc1tAbmFtZV0udmlldyA9IG51bGxcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkd2luZG93W3NldHRpbmddICdrZXl1cCcsIEBvbktleVVwXG5cdFx0QCQoJ1tkYXRhLWNsb3NlXScpW3NldHRpbmddICdjbGljaycsIEBjbG9zZUNsaWNrXG5cblx0XHRudWxsXG5cblx0b25LZXlVcCA6IChlKSA9PlxuXG5cdFx0aWYgZS5rZXlDb2RlIGlzIDI3IHRoZW4gQGhpZGUoKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRlbCwgMC4zLCB7ICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLCAnb3BhY2l0eSc6IDEsIGVhc2UgOiBRdWFkLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAndHJhbnNmb3JtJzogJ3NjYWxlKDEpJywgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IEJhY2suZWFzZU91dCB9XG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZU91dCA6IChjYWxsYmFjaykgPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAnb3BhY2l0eSc6IDAsIGVhc2UgOiBRdWFkLmVhc2VPdXQsIG9uQ29tcGxldGU6IGNhbGxiYWNrIH1cblx0XHRUd2VlbkxpdGUudG8gQCRlbC5maW5kKCcuaW5uZXInKSwgMC4zLCB7ICd0cmFuc2Zvcm0nOiAnc2NhbGUoMC44KScsICdvcGFjaXR5JzogMCwgZWFzZSA6IEJhY2suZWFzZUluIH1cblxuXHRcdG51bGxcblxuXHRjbG9zZUNsaWNrOiAoIGUgKSA9PlxuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRAaGlkZSgpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RNb2RhbFxuIiwiQWJzdHJhY3RNb2RhbCA9IHJlcXVpcmUgJy4vQWJzdHJhY3RNb2RhbCdcblxuY2xhc3MgT3JpZW50YXRpb25Nb2RhbCBleHRlbmRzIEFic3RyYWN0TW9kYWxcblxuXHRuYW1lICAgICA6ICdvcmllbnRhdGlvbk1vZGFsJ1xuXHR0ZW1wbGF0ZSA6ICdvcmllbnRhdGlvbi1tb2RhbCdcblxuXHRjYiAgICAgICA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IChAY2IpIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0ge0BuYW1lfVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRoaWRlIDogKHN0aWxsTGFuZHNjYXBlPXRydWUpID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PlxuXHRcdFx0QENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXHRcdFx0aWYgIXN0aWxsTGFuZHNjYXBlIHRoZW4gQGNiPygpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRzdXBlclxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSAndXBkYXRlRGltcycsIEBvblVwZGF0ZURpbXNcblx0XHRAJGVsW3NldHRpbmddICd0b3VjaGVuZCBjbGljaycsIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25VcGRhdGVEaW1zIDogKGRpbXMpID0+XG5cblx0XHRpZiBkaW1zLm8gaXMgJ3BvcnRyYWl0JyB0aGVuIEBoaWRlIGZhbHNlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gT3JpZW50YXRpb25Nb2RhbFxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlldydcbk9yaWVudGF0aW9uTW9kYWwgPSByZXF1aXJlICcuL09yaWVudGF0aW9uTW9kYWwnXG5cbmNsYXNzIE1vZGFsTWFuYWdlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCMgd2hlbiBuZXcgbW9kYWwgY2xhc3NlcyBhcmUgY3JlYXRlZCwgYWRkIGhlcmUsIHdpdGggcmVmZXJlbmNlIHRvIGNsYXNzIG5hbWVcblx0bW9kYWxzIDpcblx0XHRvcmllbnRhdGlvbk1vZGFsIDogY2xhc3NSZWYgOiBPcmllbnRhdGlvbk1vZGFsLCB2aWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0aXNPcGVuIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gcmV0dXJuIHRydWUgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0ZmFsc2VcblxuXHRoaWRlT3Blbk1vZGFsIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gb3Blbk1vZGFsID0gQG1vZGFsc1tuYW1lXS52aWV3ICkgZm9yIG5hbWUsIG1vZGFsIG9mIEBtb2RhbHNcblxuXHRcdG9wZW5Nb2RhbD8uaGlkZSgpXG5cblx0XHRudWxsXG5cblx0c2hvd01vZGFsIDogKG5hbWUsIGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gaWYgQG1vZGFsc1tuYW1lXS52aWV3XG5cblx0XHRAbW9kYWxzW25hbWVdLnZpZXcgPSBuZXcgQG1vZGFsc1tuYW1lXS5jbGFzc1JlZiBjYlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsTWFuYWdlclxuIl19
