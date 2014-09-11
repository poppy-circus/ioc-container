define(function() {

  'use strict';

  // helper to get the klass reference
  // used, when IoCContainer receives an instance instead of a class reference

  var getClass = function(obj) {
    var klass = obj;

    if (obj && typeof obj !== 'function')
      klass = obj.constructor;

    return klass;
  };

  // helper to clone origin prototype for reflections

  var clonePrototype = function(proto) {
    var Clone = function(){};
    Clone.prototype = proto;
    return new Clone();
  };

  //--------------------------------------------------------------------------
  //
  //  construct
  //
  //--------------------------------------------------------------------------

  /**
   * A prototype based solution to perform Dependency Injection concepts in javascript.
   *
   * It takes the prototype of a class - `origin` - and can create multiple prototypes with
   * modifications - `reflections` - of it. The reflections are controlled by a `scope`
   * identifier and became applied to a class. When instantiating a class and calling a
   * method, the reflection is targeted by the scope and became executed.
   *
   * It is possible to inject properties and methods on classes (and instances of classes).
   * On instances, the prototpye of class is used for further injections. Properties are
   * not cloned. Runtime modifications on an array or a literal, will affect all prototypes
   * sharing the same property reference. Methods got access to the origin prototype,
   * to allow polymorphism.
   *
   * @example
   *
   * var Klass = function(){};
   * Klass.prototype.fn = function(){ return 'default-' + this.prop; };
   * Klass.prototype.prop = 'foo';
   *
   * var inst_ioc, inst = new Klass();
   * var ioc = new IoCContainer();
   *
   * ioc
   *  .switchScope('myScope') //create a new scope
   *  .inject(Klass, { //injections
   *    fn: function() { return 'injected-' + this.prop; },
   *    prop: 'bar'
   *  }})
   *  .synthesize(); //switch to myScope reflection
   * inst_ioc = new Klass();
   *
   * console.log(inst.fn()); //returns 'default-foo'
   * console.log(inst_ioc.fn()); //returns 'inejected-bar'
   *
   * ioc.dispose(); //remove reflections
   * console.log(new Klass().fn()); //returns 'default-foo'
   *
   * @constructor IoCContainer
   *
   * @version 1.0.2
   * @author Tobias Busse
   * @copyright Tobias Busse @2014
   */
  var IoCContainer = function() {

    // holds the actual scope - important when using inject

    this._currentScope = this.switchScope().getCurrentScope();

    // holds the default prototype of class references

    this._originPrototypes = [];

    // holds the class references

    this._origins = [];

    // holds manipulated class prototypes with iocDetail

    this._reflections = [];

    // holds the initial reflection of a class prototype with iocDetail but no injections
    // when working with transitive injections we need to create a master reflection of the origin
    // otherwise we cant switch back correctly to the default implementation
    // this is caused by the fact that flushed references wouldn't have a scope

    this._masterReflections = [];
  };

  //--------------------------------------------------------------------------
  //
  //  static
  //
  //--------------------------------------------------------------------------

  /**
   * Representation of the overall amount of created reflections.
   *
   * An IoCContainer can create scopes automaticly. To create unique scope values
   * the numScopes property is used.
   *
   * @example
   *
   * var ioc = new IoCContainer();
   * console.log(IoCContainer.numScopes); // 1 (initial scope)
   *
   * @name numScopes
   * @type uint
   * @readonly
   * @memberOf IoCContainer
   */
  IoCContainer.numScopes = 0;

  /**
   * Representation of a scope value that targets the origin.
   *
   * The ORIGIN_SCOPE can be used during application runtime to switch back to
   * the origin without loosing reflections.
   *
   * @example
   *
   * var Klass = function(){};
   * Klass.prototype.prop = 'default';
   *
   * var ioc = new IoCContainer();
   *
   * ioc
   *  .inject(Klass, { prop: 'inject' }})
   *  .synthesize();
   *
   * console.log(new Klass().prop); // inject
   *
   * ioc.synthesize(IoCContainer.ORIGIN_SCOPE);
   * console.log(new Klass().prop); // default
   *
   * @constant {String} ORIGIN_SCOPE
   * @memberOf IoCContainer
   */
  IoCContainer.ORIGIN_SCOPE = 'origin-scope';

  /**
   * Create an IoCContainer instance with initial scope and origin reflections.
   *
   * @param {String=} scope - Defines the actual scope of the create IoCContainer instance.
   *        If not defined, the initial scope is create automaticly.
   * @param {iocDetail[]} [iocDetails] - An array of config items to setup injections.
   *        Origin, inections and scope property of an iocDetail is mandatory. Otherwise
   *        the injection is not created.
   * @returns {IoCContainer} an instance of IoCContainer
   *
   * @example
   *
   * var Klass = function(){};
   * var ioc = IoCContainer.create('initialScope', [{
   *
   *  scope: 'initialScope',
   *  origin: Klass,
   *  injections: {
   *    sayHello: function() { return 'hello'; }
   *  }//...further details
   *
   * }]);
   *
   * ioc.synthesize();
   * console.log(new Klass().sayHello); // hello
   *
   * @function IoCContainer.create
   */
  IoCContainer.create = function(scope, iocDetails) {
    var detail, ioc = new IoCContainer();
    scope = scope || ioc.getCurrentScope();

    for(var i=0, len=iocDetails && iocDetails.length || 0; i<len; i++) {
      detail = iocDetails[i];

      if(detail.scope) {
        ioc
          .switchScope(detail.scope)
          .inject(detail.origin, detail.injections, detail.vars);
      }
    }

    // switch back to the initial scope after injections

    return ioc.switchScope(scope);
  };

  //--------------------------------------------------------------------------
  //
  //  public method
  //
  //--------------------------------------------------------------------------

  var proto = IoCContainer.prototype;

  /**
   * Evaluate if a given class or class instance has currently its origin
   * or a reflection prototype.
   *
   * @param {Object} obj - a class object or an instance of a class.
   * @returns {Boolean} true when the class is known and has origin
   *          prototype otherwise false
   *
   * @see IoCContainer#isReflection
   *
   * @function IoCContainer#isOrigin
   */
  proto.isOrigin = function(obj) {
    obj = getClass(obj);
    var proto = obj && obj.prototype;

    return this._originPrototypes.indexOf(proto) !== -1;
  };

  /**
   * Evaluate if a given class or class instance has currently a reflection
   * or its origin prototype.
   *
   * @param {Object} obj - a class object or an instance of a class.
   * @returns {Boolean} true when the class is known and has reflection
   *          prototype otherwise false
   *
   * @see IoCContainer#isOrigin
   *
   * @function IoCContainer#isReflection
   */
  proto.isReflection = function(obj) {
    obj = getClass(obj);
    var proto = obj && obj.prototype;

    return this._reflections.indexOf(proto) !== -1;
  };

  /**
   * Get the actual scope.
   * A scope is used to target a specific reflection that was created by
   * an origin.
   *
   * @returns {String} actual scope of an IoCCotnainer
   *
   * @function IoCContainer#getCurrentScope
   */
  proto.getCurrentScope = function() {
    return this._currentScope;
  };

  /**
   * Switch the actual scope of an IoCContainer.
   * Further injections will use the defined scope.
   *
   * To switch back to the origin prototype without loosing reflections
   * use `IoCContainer.ORIGIN_SCOPE`.
   *
   * @param {String=} scope - a value that became the current scope of an IoCContainer.
   *        If not defined, a new unique scope became created and assigned.
   * @returns {IoCContainer} the IoCContainer instance for chaining
   *
   * @function IoCContainer#switchScope
   */
  proto.switchScope = function(scope) {
    var numScopes = IoCContainer.numScopes += 1;
    this._currentScope = scope || 'scope-' + numScopes;
    return this;
  };

  /**
   * Applies the same scope to a list of reflections.
   *
   * @param {String=} scope - a value that is applied to each reflection as scope value.
   *        If not defined, the current scope of the current IoCContainer is used.
   * @param {Object[]} [reflections] - an array of prototypes to share the same scope.
   *        If not defined, all known reflections by the current IoCContainer are used.
   * @returns {IoCContainer} the IoCContainer instance for chaining
   *
   * @function IoCContainer#shareScope
   */
  proto.shareScope = function(scope, reflections) {
    reflections = reflections || this._reflections;
    scope = scope || this._currentScope;

    for (var i=0, len=reflections.length; i<len; i++) {
      reflections[i].__ioc.scope = scope;
    }
    return this;
  };

  /**
   * Get the origin prototype from a class object or instance.
   *
   * @param {Object} obj - a class object or class instance
   * @returns {Object} the origin prototype. If obj is unknown by an IoCContainer
   *          reference, the return value is null.
   *
   * @function IoCContainer#getOriginOf
   */
  proto.getOriginOf = function(obj) {
    var origin, reflection, reflections = this._reflections;

    if (this.isOrigin(obj))
      origin = getClass(obj).prototype;

    else if (this.isReflection(obj))
      origin = reflections[reflections.indexOf(getClass(obj).prototype)].__ioc.origin;

    return origin;
  };

  /**
   * Get all generated reflection prototypes of a class object or instance.
   *
   * @param {Object} obj - a class object or class instance
   * @returns {Array} the reflection prototypes. If obj is unknown by an IoCContainer
   *          or has no reflections, the return value is an empty Array.
   *
   * @function IoCContainer#getReflectionsOf
   */
  proto.getReflectionsOf = function(obj) {
    var result = [];
    var origin = this.getOriginOf(obj);
    var reflections, reflection;

    if (origin) {
      reflections = this._reflections;

      for (var i=0, len=reflections.length; i<len; i++) {
        reflection = reflections[i];

        if (origin === reflection.__ioc.origin)
          result.push(reflection);
      }
    }

    return result;
  };

  /**
   * Get origin prototype references from an IoCContainer by a selector function.
   *
   * @param {iocSelector} selector - a callback function to evaluate iocDetails
   * @returns {Array} the selected origins. If no detail matches due to the selector
   *          function the result is an empty Array.
   *
   * @function IoCContainer#getOriginsWhere
   */
  proto.getOriginsWhere = function(selector) {
    var origin, result = [];
    var reflection, reflections = this.getReflectionsWhere(selector);

    for (var i=0, len=reflections.length; i<len; i++) {
      reflection = reflections[i];
      origin = reflection.__ioc.origin;

      if (result.indexOf(origin) === -1)
        result.push(origin);
    }

    return result;
  };

  /**
   * Get reflection prototype references from an IoCContainer by a selector function.
   *
   * @param {iocSelector} selector - a callback function to evaluate iocDetails
   * @returns {Array} the selected reflections. If no detail matches due to the selector
   *          function the result is an empty Array.
   *
   * @function IoCContainer#getReflectionsWhere
   */
  proto.getReflectionsWhere = function(selector) {
    var result = [];
    var reflection, reflections = this._reflections;

    if (typeof selector === 'function') {
      for (var i=0, len=reflections.length; i<len; i++) {

        reflection = reflections[i];
        if (selector(reflection.__ioc))
          result.push(reflection);
      }
    }

    return result;
  };

  /**
   * Create a reflection from an origin prototype.
   *
   * @param {Object} obj - a class object or class instance.
   *        If not defined, an injection is not performed.
   * @param {Object} injections - A collection of properties and methods that affects
   *        the origin. If not defined, an injection is not performed.
   * @param {Object=} vars - Optional vars that are stored within the iocDetail of a
   *        reflection. Every reflection creates a hidden property `__ioc` which holds
   *        the scope, the origin prototype and vars. By default those vars object is
   *        empty as long as it is not defined.
   * @returns {IoCContainer} the IoCContainer instance for chaining
   *
   * @example
   *
   * var Klass = function(){};
   * var ioc = new IoCContainer();
   * ioc
   *  .switchScope('a')
   *  .inject(Klass, {value: 'scope-a'})
   *
   *  .switchScope('b')
   *  .inject(Klass, {value: 'scope-b'}, {foo: 'bar'});
   *
   * ioc.getReflectionsOf(Klass);
   * //[{__ioc:{scope:'a'}}, {__ioc:{scope:'b', vars: {foo: 'bar'}}}]
   *
   * @function IoCContainer#inject
   */
  proto.inject = function(obj, injections, vars) {
    var origin, reflection;

    if (obj && injections) {

      // get class reference when injected by an instance

      obj = getClass(obj);

      // import origin
      // we need to import the prototype seperatly
      // due to the origin proto modifications

      if (!this.isReflection(obj) && !this.isOrigin(obj)) {
        this._origins.push(obj);
        this._originPrototypes.push(obj.prototype);

        // we need to have a reflection without modifications but ioc detail

        this._masterReflections.push(
          this._createMasterReflection(obj.prototype)
        );
      }

      // create reflection
      // we have to get the origin because the obj argument
      // could be already a reflection

      origin = this.getOriginOf(obj);
      reflection = this._createReflection(origin, injections, vars);
      this._reflections.push(reflection);
    }

    return this;
  };

  /**
   * Switches the prototype of a class object reference.
   *
   * Common practice is to apply all injections at application runtime and to
   * synthesize one time at startup for initial behaviour and later on to alter
   * defaults. Calling synthesize is normally bounded to conditions in the main
   * application driver.
   *
   * @param {String=} scope - the reflection identifier.
   *        If not defined, the current scope of IoCConainer reference is used.
   * @returns {IoCContainer} the IoCContainer instance for chaining
   *
   * @example
   *
   * //complex setup with transitive dependencies
   * var Klass1 = function(){};
   * var Klass2 = function(){};
   * var ioc = new IoCContainer();
   *
   * Klass1.prototype.get = function(){ return 'default-' + new Klass2().value};
   *
   * ioc
   *  .switchScope('startup')
   *  .inject(Klass2, {value: 'behaviour'})
   *
   *  .switchScope('runtime')
   *  .inject(Klass2, {value: 'behaviour-extended'})
   *  .inject(Klass1, {get: function() { return 'injected-' + new Klass2().value }})
   *
   *  .switchScope('leave')
   *  .inject(Klass2, {value: 'behaviour-extreme'})
   *  .inject(Klass1, {get: function() { return this.__ioc.origin.get.call(this) + '-exit' }})
   *
   * //at startup
   * ioc.synthesize('startup'); new Klass1().get(); //default-behaviour
   * //during runtime
   * ioc.synthesize('runtime'); new Klass1().get(); //injected-behaviour-extended
   * //switch back to startup condition
   * ioc.synthesize('leave'); new Klass1().get(); //default-behaviour-exit
   *
   * @function IoCContainer#synthesize
   */
  proto.synthesize = function(scope) {

    var i, len;
    var reflection, reflections;
    var origins = this._origins, originPrototypes = this._originPrototypes;

    // switch to the defined scope or keep the actual scope

    scope = scope || this._currentScope;

    // find matching reflections

    reflections = scope === IoCContainer.ORIGIN_SCOPE ?
      this._masterReflections :
      this.getReflectionsWhere(function(iocDetail) {
        return iocDetail.scope === scope;
      });

    // update the origin prototype

    for(i=0, len=reflections.length; i<len; i++) {
      reflection = reflections[i];
      origins[originPrototypes.indexOf(reflection.__ioc.origin)].prototype = reflection;
    }

    return this;
  };

  /**
   * Remove reflections from an IoCContainer.
   *
   * When a class currently has a flushed reflection prototype, the prototype became
   * reseted to the origin prototype.
   *
   * For a complete reset, use dispose. The difference between those two methods is,
   * that flush keeps a single hidden reflections - master reflection - which is an
   * exact representation of the origin with an applied iocDetail. It is used to perform
   * switches to the `ORIGIN_SCOPE`.
   *
   * @param {Array=} reflections - a list of reflection prototypes
   *        If not defined, all known reflections became flushed.
   * @returns {IoCContainer} the IoCContainer instance for chaining
   *
   * @see IoCContainer#dispose
   * @function IoCContainer#flush
   */
  proto.flush = function(reflections) {
    var len, rindex, oindex;
    var reflection, origin, origins = this._origins;
    var originreflections = this._reflections;
    var originPrototype, originPrototypes = this._originPrototypes;

    reflections = reflections || this._reflections;
    len = reflections.length;

    while(len) {

      len--;
      reflection = reflections[0];
      rindex = originreflections.indexOf(reflection);

      // assure that the reflection is known by ioc instance

      if (rindex > -1) {

        // find the origin reference that matches reflection

        originreflections.splice(rindex, 1);
        originPrototype = reflection.__ioc.origin;
        oindex = originPrototypes.indexOf(originPrototype);
        origin = origins[oindex];

        // reset to origin prototype if a reflection is active

        if(origin.prototype === reflection)
          origin.prototype = originPrototype;
      }
    }

    return this;
  };

  /**
   * Reset IoCContainer to initial state.
   * The dispose method will also remove the master reflection references.
   *
   * @returns {IoCContainer} the IoCContainer instance for chaining
   *
   * @see IoCContainer#flush
   * @function IoCContainer#dispose
   */
  proto.dispose = function() {
    this.flush();
    this._originPrototypes.length = 0;
    this._origins.length = 0;
    this._masterReflections.length = 0;

    return this;
  };

  //--------------------------------------------------------------------------
  //
  //  internal method
  //
  //--------------------------------------------------------------------------

  // creates reflection and manipualtes the prototype on inject

  proto._createReflection = function(origin, injections, vars) {

    // create reflection

    var injection;
    var reflection = clonePrototype(origin);

    // define iocDetail

    reflection.__ioc = {
      vars: vars || {},
      origin: origin, // enables polymorph
      scope: this._currentScope
    };

    // assign injections

    for (var name in injections) {
      injection = injections[name];
      reflection[name] = typeof injection === 'function' ?
        this._wrapInjection(injection) :
        reflection[name] = injection;
    }

    return reflection;
  };

  // create first reflection with ioc detail only on inject
  // resolves problems on transitive dependencies

  proto._createMasterReflection = function(origin) {
    var reflection = clonePrototype(origin);

    reflection.__ioc = {
      vars: {},
      scope: IoCContainer.ORIGIN_SCOPE,
      origin: origin
    };

    // use original function without any modifications
    // but before call synthesize

    for (var fn in reflection) {
      if (typeof reflection[fn] === 'function')
        reflection[fn] = this._wrapInjection(origin[fn]);
    }

    return reflection;
  };

  proto._wrapInjection = function(injection) {
    var self = this;

    // we need to wrap each function to switch the scope for synthesization
    // only then we can create correct reflections for further injections
    // in a single call stack

    return function() {

      // this is the scope of a reflection instance

      self.synthesize(this.__ioc.scope);
      return injection.apply(this, arguments);
    };
  };

  return IoCContainer;
});

//--------------------------------------------------------------------------
//
//  iocSelector
//
//--------------------------------------------------------------------------

/**
 * Called from an IoCContainer to filter reflections and origins.
 *
 * @param {iocDetail} detail - an object that includes specifications about a reflection.
 *
 * @see IoCContainer
 * @callback iocSelector
 */

//--------------------------------------------------------------------------
//
//  iocDetail
//
//--------------------------------------------------------------------------

/**
 * An object that acts as an identifications for reflections of an IoCContainer.
 * It is also used to define injections using `IoCContainer.create`.
 *
 * @property {String} scope - A reflection identifier to switch
 *           between class prototypes.
 * @property {Object} origin - A class object or class instance
 *           when using by injections for IoCContainer.create or
 *           the origin prototype of a class when working with reflections.
 * @property {Array=} injections - Can be used to define injections
 *           for IoCContainer.create.
 * @property {Object=} vars - A collection of properties that can be applied
 *           to a reflection prototype.
 *
 * @see IoCContainer
 * @namespace iocDetail
 * @type Object
 */
