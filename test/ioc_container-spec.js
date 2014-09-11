require([
  'src/ioc_container'
], function(
  IoCContainer
) {

  describe('IoCContainer', function() {

    it('is a class', function() {
      expect(new IoCContainer() instanceof IoCContainer).toBe(true);
    });

    describe('constructor', function() {

      it('sets an initial scope', function() {
        expect(new IoCContainer().getCurrentScope()).toBe('scope-' + IoCContainer.numScopes);
      });
    });

    describe('static', function() {

      describe('-numScopes', function() {

        it('became incremented by 1 when switching the scope', function() {
          var numScopes = IoCContainer.numScopes;

          var ioc = new IoCContainer(); numScopes++; //auto scope creation
          ioc.switchScope(); numScopes++;
          ioc.switchScope('myScope'); numScopes++;

          expect(IoCContainer.numScopes).toBe(numScopes);
        });
      });

      describe('-ORIGIN_SCOPE', function() {

        it('defines the scope name for master reflections', function() {
          expect(IoCContainer.ORIGIN_SCOPE).toBe('origin-scope');
        });
      });

      describe('::create', function() {

        var ioc, Klass, Klass2;

        beforeEach(function() {
          Klass = function(){};
          Klass.prototype.get = function() { return 'foo'; };

          Klass2 = function(){};
          Klass2.prototype.get = function() { return 'bar'; };

          ioc = IoCContainer.create('first', [{

              scope: 'first',
              origin: Klass,
              injections: {
                get: function() { return this.__ioc.scope + this.__ioc.origin.get.call(this); }
              }
            }, {

              scope: 'first',
              origin: Klass2,
              injections: {
                get: function() { return this.__ioc.scope + this.__ioc.origin.get.call(this); }
              }
            }, {

              scope: 'second',
              injections: {
                get: function() { return 'fail'; }
              }
            }, {

              origin: Klass2,
              injections: {
                get: function() { return 'fail'; }
              }
            }
          ]);
        });

        it('returns an IoCContainer instance', function() {
          expect(IoCContainer.create() instanceof IoCContainer).toBe(true);
        });

        it('allows to sets an intial scope', function() {
          expect(ioc.getCurrentScope()).toBe('first');
        });

        it('allows to apply injections in the context of the created IoCContainer', function() {
          ioc.synthesize();

          expect([
            new Klass().get(),
            new Klass2().get()
          ]).toEqual([
            'firstfoo',
            'firstbar'
          ]);
        });

        it('won`t perform injection on classes if origin is missing', function() {
          expect(ioc.getReflectionsOf(Klass).length).toBe(1);
        });

        it('won`t perform injection on classes if scope is missing', function() {
          expect(ioc.getReflectionsOf(Klass2).length).toBe(1);
        });
      });
    });

    describe('method', function() {

      var ioc;
      var inst, Klass;

      beforeEach(function() {
        ioc = new IoCContainer();
        Klass = function(){};
        inst = new Klass();
      });

      describe('::isOrigin', function() {

        it('returns `false` by default', function() {
          expect(ioc.isOrigin()).toBe(false);
        });

        it('returns `false` if an origin is unknown by the IoCContainer', function() {
          expect(
            ioc.isOrigin(Klass) &&
            ioc.isOrigin(inst)
          ).toBe(false);
        });

        it('returns `true` if an origin is known by the IoCContainer when requesting by class', function() {
          ioc.inject(Klass, {});
          expect(ioc.isOrigin(Klass)).toBe(true);
        });

        it('returns `true` if an origin is known by the IoCContainer when requesting by instance', function() {
          ioc.inject(Klass, {});
          expect(ioc.isOrigin(inst)).toBe(true);
        });

        it('returns `false` if the origin is known by the IoCContainer but the prototype a synthesized reflection', function() {
          ioc
            .inject(Klass, {})
            .synthesize();

          expect(ioc.isOrigin(Klass)).toBe(false);
        });

        it('returns `false` if the origin is flushed after synthesized', function() {
          ioc
            .inject(Klass, {})
            .synthesize()
            .flush();

          expect(ioc.isOrigin(Klass)).toBe(true);
        });
      });

      describe('::isReflection', function() {

        it('returns `false` by default', function() {
          expect(ioc.isReflection()).toBe(false);
        });

        it('returns `false` if a reflection is unknown by the IoCContainer', function() {
          expect(
            ioc.isReflection(Klass) &&
            ioc.isReflection(inst)
          ).toBe(false);
        });

        it('returns `false` if a reflection is known by the IoCContainer but currently not synthesized', function() {
          ioc.inject(Klass, {});
          expect(
            ioc.isReflection(Klass) &&
            ioc.isReflection(inst)
          ).toBe(false);
        });

        it('returns `true` if the reflection is synthesized and known by the IoCContainer', function() {
          ioc
            .inject(Klass, {})
            .synthesize();

          expect(ioc.isReflection(Klass)).toBe(true);
        });

        it('returns `false` if the reflection is flushed', function() {
          ioc
            .inject(Klass, {})
            .synthesize()
            .flush();

          expect(ioc.isReflection(Klass)).toBe(false);
        });
      });

      describe('::getCurrentScope', function() {

        it('returns the actual activated scope', function() {
          ioc.switchScope('myScope');
          expect(ioc.getCurrentScope()).toBe('myScope');
        });
      });

      describe('::switchScope', function() {

        it('replaces the current scope with a new one', function() {
          ioc.switchScope('initialScope');
          ioc.switchScope('newScope');
          expect(ioc.getCurrentScope()).toBe('newScope');
        });

        it('creates a scope automaticly if not defined as argument', function() {
          ioc.switchScope();
          expect(ioc.getCurrentScope()).toBe('scope-' + IoCContainer.numScopes);
        });

        it('increments the amount of numScopes by 1', function() {
          var numScopes = IoCContainer.numScopes;
          ioc.switchScope();
          expect(IoCContainer.numScopes).toBe(numScopes + 1);
        });

        it('returns the IoCContainer instance', function() {
          expect(ioc.switchScope()).toBe(ioc);
        });
      });

      describe('::shareScope', function() {

        beforeEach(function() {
          ioc
            .switchScope('scopeA')
            .inject(Klass, {}, {index: 0})
            .switchScope('scopeB')
            .inject(Klass, {}, {index: 1})
            .switchScope('scopeC')
            .inject(Klass, {}, {index: 2});
        });

        it('sets the same scope to a selection of reflections', function() {
          ioc.shareScope('sharedScope', ioc.getReflectionsWhere(function(iocDetail) {
            return iocDetail.vars.index > 0;
          }));

          var reflections = ioc.getReflectionsOf(Klass);

          expect([
            reflections[0].__ioc.scope,
            reflections[1].__ioc.scope,
            reflections[2].__ioc.scope
          ]).toEqual([
            'scopeA',
            'sharedScope',
            'sharedScope'
          ]);
        });

        it('can set the same scope to all reflections', function() {
          ioc.shareScope('sharedScope');
          var reflections = ioc.getReflectionsOf(Klass);

          expect([
            reflections[0].__ioc.scope,
            reflections[1].__ioc.scope,
            reflections[2].__ioc.scope
          ]).toEqual([
            'sharedScope',
            'sharedScope',
            'sharedScope'
          ]);
        });

        it('sets the current scope to all reflections by default', function() {
          ioc.switchScope('sharedScope');
          ioc.shareScope();
          var reflections = ioc.getReflectionsOf(Klass);

          expect([
            reflections[0].__ioc.scope,
            reflections[1].__ioc.scope,
            reflections[2].__ioc.scope
          ]).toEqual([
            'sharedScope',
            'sharedScope',
            'sharedScope'
          ]);
        });
      });

      describe('::getOriginOf', function() {

        it('returns the origin by class reference', function() {
          ioc.inject(Klass, {});
          expect(ioc.getOriginOf(Klass)).toBe(Klass.prototype);
        });

        it('returns the origin by instance reference', function() {
          ioc.inject(Klass, {});
          expect(ioc.getOriginOf(inst)).toBe(Klass.prototype);
        });

        it('returns undefined if the origin is unknown', function() {
          expect(ioc.getOriginOf(Klass)).toBeUndefined();
        });

        it('returns undefined on insufficient/invalid parameters', function() {
          expect(
            ioc.getOriginOf() &&
            ioc.getOriginOf(undefined)
          ).toBeUndefined();
        });

        it('returns the origin if it is already a synthesized reflection', function() {
          var proto = Klass.prototype;

          ioc
            .inject(Klass, {})
            .synthesize();

          expect(ioc.getOriginOf(Klass)).toBe(proto);
        });
      });

      describe('::getReflectionsOf', function() {

        it('returns an array of available reflections by class origin', function() {
          ioc
            .inject(Klass, {})
            .inject(Number, {})
            .switchScope()
            .inject(Klass, {})
            .inject(Object, {});

          expect(ioc.getReflectionsOf(Klass).length).toBe(2);
        });

        it('returns an array of available reflections by instance origin', function() {
          IoCContainer.numScopes = 0;
          ioc = new IoCContainer();

          ioc
            .inject(Klass, {})
            .inject(Number, {})
            .switchScope()
            .inject(Klass, {})
            .inject(Object, {});

          expect(ioc.getReflectionsOf(inst).length).toBe(2);
        });

        it('returns an empty array if no reflection can be found', function() {
          ioc.inject(Object, {});
          expect(ioc.getReflectionsOf(Klass)).toEqual([]);
        });

        it('returns an empty array if no reflection exists', function() {
          expect(ioc.getReflectionsOf(Klass)).toEqual([]);
        });

        it('returns an empty array on insufficient parameters', function() {
           expect(ioc.getReflectionsOf()).toEqual([]);
        });

        it('returns an array of reflections for a given origin after synthesized (reflection)', function() {
          var Klass2 = function(){};

          ioc
            .inject(Klass, {})
            .inject(Klass2, {})
            .synthesize();

          expect(ioc.getReflectionsOf(Klass)).toEqual([Klass.prototype]);
        });
      });

      describe('::getOriginsWhere', function() {

        it('returns an empty array by default', function() {
          expect(ioc.getOriginsWhere()).toEqual([]);
        });

        it('returns an empty array on invalid `fn` argument type', function() {
          expect(ioc.getOriginsWhere(12345)).toEqual([]);
        });

        it('returns an empty array when no origin exists', function() {
          expect(ioc.getOriginsWhere(function(){
            return true;
          })).toEqual([]);
        });

        it('returns an array of selected and unique origins', function() {
          var Klasses = [
            function(){},
            function(){},
            function(){},
            function(){},
            Klass,
            Klass
          ];

          ioc.inject(Klasses[0], {});
          ioc.inject(Klasses[1], {}, {select: true});
          ioc.inject(Klasses[2], {});
          ioc.inject(Klasses[3], {});
          ioc.inject(Klasses[4], {}, {select: true});
          ioc.inject(Klasses[5], {}, {select: true});

          expect(ioc.getOriginsWhere(function(iocDetail){
            return iocDetail.vars.select;
          })).toEqual([
            Klasses[1].prototype,
            Klass.prototype
          ]);
        });
      });

      describe('::getReflectionsWhere', function() {

        it('returns an empty array by default', function() {
          expect(ioc.getReflectionsWhere()).toEqual([]);
        });

        it('returns an empty array on invalid `fn` argument type', function() {
          expect(ioc.getReflectionsWhere(12345)).toEqual([]);
        });

        it('returns an empty array when no reflection exists', function() {
          expect(ioc.getReflectionsWhere(function(){
            return true;
          })).toEqual([]);
        });

        it('returns an array of selected reflections', function() {
          IoCContainer.numScopes = 0;
          ioc = new IoCContainer();

          var Klasses = [
            function(){},
            function(){},
            function(){},
            function(){},
            Klass,
            Klass
          ];

          ioc.inject(Klasses[0], {});
          ioc.inject(Klasses[1], {});
          ioc.inject(Klasses[2], {}, {index: 1});
          ioc.inject(Klasses[3], {});
          ioc.inject(Klasses[4], {}, {index: 2});
          ioc.inject(Klasses[5], {}, {index: 2});

          expect(ioc.getReflectionsWhere(function(iocDetail){
            return !!iocDetail.vars.index;
          })).toEqual([
            { __ioc : { scope: 'scope-1', origin: Klasses[2].prototype, vars: {index: 1}}},
            { __ioc : { scope: 'scope-1', origin: Klass.prototype, vars: {index: 2}}},
            { __ioc : { scope: 'scope-1', origin: Klass.prototype, vars: {index: 2}}}
          ]);
        });
      });

      describe('::inject', function() {

        it('returns the IoCContainer reference', function() {
          expect(ioc.inject(Klass, {})).toBe(ioc);
        });

        it('won`t store an origin reference if not defined', function() {
          ioc.inject(null, {});
          expect(ioc.getOriginOf(null)).toBeUndefined();
        });

        it('won`t store an origin reference if injections are not defined', function() {
          ioc.inject(Klass, undefined);
          expect(ioc.getOriginOf(Klass)).toBeUndefined();
        });

        it('stores an origin class reference', function() {
          ioc.inject(Klass, {});
          expect(ioc.getOriginOf(Klass)).toBe(Klass.prototype);
        });

        it('stores an origin class reference by instance', function() {
          ioc.inject(inst, {});
          expect(ioc.getOriginOf(Klass)).toBe(Klass.prototype);
        });

        it('creates a reflection of an origin', function() {
          ioc.inject(Klass, {});
          expect(ioc.getReflectionsOf(Klass)[0]).toBeDefined();
        });

        it('won`t store an already known origin twice', function() {
          ioc
            .inject(Klass, {})
            .inject(Klass, {});
          expect(ioc.getOriginsWhere(function(iocDetail) {
            return iocDetail.oid > 0;
          })).toEqual([]);
        });

        it('can create multiple reflections of a single origin', function() {
          ioc
            .inject(Klass, {})
            .switchScope()
            .inject(Klass, {});
          expect(ioc.getReflectionsOf(Klass).length).toBe(2);
        });

        describe('IoCDetail definition', function() {
          var reflection;

          beforeEach(function() {
            IoCContainer.numScopes = 0;
            ioc = new IoCContainer();

            ioc
              .switchScope('myScope')
              .inject(Klass, {});

            reflection = ioc.getReflectionsOf(Klass)[0];
          });

          it('creates an `__ioc` object', function() {
            expect(reflection.__ioc).toBeDefined();
          });

          it('applies the current scope', function() {
            expect(reflection.__ioc.scope).toBe('myScope');
          });

          it('applies the origin reference', function() {
            expect(reflection.__ioc.origin).toBe(Klass.prototype);
          });

          it('can add custom vars', function() {
            ioc
              .switchScope('customVars')
              .inject(Klass, {}, {foo: 'bar'});

            reflection = ioc.getReflectionsOf(Klass)[1];
            expect(reflection).toEqual({
              __ioc: {
                vars: {foo: 'bar'},
                origin: Klass.prototype,
                scope: 'customVars'
              }
            });
          });

          it('doesn`t change injected props of a reflection when multiple reflections are available', function() {
            ioc
              .switchScope()
              .inject(Klass, {});

            expect(reflection).toEqual({
              __ioc: {
                vars: {},
                origin: Klass.prototype,
                scope: 'myScope'
              }
            });
          });
        });

        describe('prototype manipulation', function() {

          it('can modify a prototype method', function() {
            Klass.prototype.foo = function(){};

            ioc.inject(Klass, {
              foo: function(){}
            });

            expect(ioc.getReflectionsOf(Klass)[0].foo)
              .not.toBe(ioc.getOriginOf(Klass).foo);
          });

          it('can modify a prototype property', function() {
            Klass.prototype.foo = 1;

            ioc.inject(Klass, {
              foo: 2
            });

            expect(ioc.getReflectionsOf(Klass)[0].foo - 1)
              .toBe(ioc.getOriginOf(Klass).foo);
          });

          it('won`t loose current prototype methods', function() {
            Klass.prototype.foo = function(){};

            ioc.inject(Klass, {
              foo2: function(){}
            });

            expect(ioc.getReflectionsOf(Klass)[0].foo).toBeDefined();
          });

          it('can append a prototype method', function() {
            ioc.inject(Klass, {
              foo: function(){}
            });

            expect(ioc.getReflectionsOf(Klass)[0].foo).toBeDefined();
          });

          it('creates a new prototype', function() {
            ioc.inject(Klass, {
              foo: function(){}
            });

            expect(ioc.getReflectionsOf(Klass)[0].foo).not.toBe(Klass.prototype);
          });
        });
      });

      describe('::synthesize', function() {

        beforeEach(function(){
          Klass = function(){};
          Klass.prototype.foo = function(param) { return 'origin-' + param; };

          ioc.inject(Klass, {
            foo: function(param) { return 'inject-' + param; }
          });
        });

        it('updates a class prototype', function() {
          ioc.synthesize();
          expect(new Klass().foo('test')).toBe('inject-test');
        });

        it('updates all class prototypes of the same scope', function() {
          var Klass2 = function(){};

          ioc.inject(Klass2, {
            foo: function(param) {
              return 'delegate-' + new Klass().foo(param);
            }
          });

          ioc.synthesize();
          expect(new Klass2().foo('test')).toBe('delegate-inject-test');
        });

        it('won`t update class prototypes of different scopes', function() {
          var Klass2 = function(){};

          ioc
            .switchScope('myScope')
            .inject(Klass2, {
              foo: function(param) {
                return 'delegate-' + new Klass().foo(param);
              }
            });

          ioc.synthesize();
          expect(new Klass2().foo('test')).toBe('delegate-origin-test');
        });

        it('allows to pass a different scope', function() {
          var Klass2 = function(){};

          ioc
            .switchScope('myScope')
            .inject(Klass2, {
              foo: function(param) {
                return 'delegate-' + new Klass().foo(param);
              }
            })
            .switchScope();

          ioc.synthesize('myScope');
          expect(new Klass2().foo('test')).toBe('delegate-origin-test');
        });

        it('resets the scope when a different scope was passed', function() {
          var Klass2 = function(){};

          ioc
            .switchScope('myScope')
            .inject(Klass2, {
              foo: function(param) {
                return 'delegate-' + new Klass().foo(param);
              }
            })
            .switchScope('nextScope')
            .synthesize('myScope');

          new Klass2().foo('test');
          expect(ioc.getCurrentScope()).toBe('nextScope');
        });

        it('returns the IoCContainer instance', function() {
          expect(ioc.synthesize()).toBe(ioc);
        });

        it('has access to the origin prototype (iocDetail)', function() {
          ioc
            .switchScope('myScope')
            .inject(Klass, {
              foo: function(param) { return 'inject-' + this.__ioc.origin.foo.call(this, param); }
            });

          ioc.synthesize('myScope');
          expect(new Klass().foo('test')).toBe('inject-origin-test');
        });

        it('doesn`t effect subclasses when injecting into the super class', function() {
          Klass = function() {};
          Klass.prototype.foo = function() { return 'default'; };

          var Clone = function(){};
          Clone.prototype = Klass.prototype;

          SubKlass = function() { Klass.call(this); };
          SubKlass.prototype = new Clone();

          ioc = new IoCContainer()
            .switchScope()
            .inject(Klass, {foo: function() { return 'inject'; }})
            .synthesize();

          expect([
            new SubKlass().foo(),
            new Klass().foo()

          ]).toEqual(['default', 'inject']);
        });

        it('allows transitive injections', function() {
          Klass = function(value) { this.value = value; };
          var Klass2 = function() {};

          Klass.prototype.bar = function(){ return this.value + '-default'; };
          Klass2.prototype.foo = function() { return new Klass('inst'); };

          ioc
            .switchScope('case1')
            .inject(Klass, {bar: function() { return this.value + '-injection1'; }})
            .inject(Klass2, {foo: function() { return new Klass('inst1'); }})

            .switchScope('case2')
            .inject(Klass, {bar: function() { return this.value + '-injection2'; }})
            .inject(Klass2, {foo: function() { return new Klass('inst2'); }});

          var inst0, inst0_1, inst1, inst1_1, inst2;

          inst0 = new Klass2();
          ioc.synthesize('case1'); inst1 = new Klass2();
          ioc.synthesize('case2'); inst2 = new Klass2();
          ioc.synthesize('case1'); inst1_1 = new Klass2();

          ioc.synthesize(IoCContainer.ORIGIN_SCOPE);
          inst0_1 = new Klass2();

          var result = [
            inst0.foo().bar(),
            inst1.foo().bar(),
            inst2.foo().bar(),
            inst1_1.foo().bar(),
            inst0_1.foo().bar()
          ];

          ioc.flush();
          result.push(new Klass2().foo().bar());

          expect(result).toEqual([
            'inst-default',
            'inst1-injection1',
            'inst2-injection2',
            'inst1-injection1',
            'inst-default',
            'inst-default'
          ]);
        });
      });

      describe('::dispose', function() {
        it('removes all known origins', function() {
          ioc
            .inject(Klass, {})
            .dispose();

          expect(ioc.isOrigin(Klass)).toBe(false);
        });

        it('removes all known reflections', function() {
          ioc
            .inject(Klass, {})
            .synthesize()
            .dispose();

          expect(ioc.isReflection(Klass)).toBe(false);
        });

        it('resets all origins', function() {
          var foo = function(){};
          Klass.prototype.foo = foo;

          ioc
            .inject(Klass, {foo: function() {}})
            .synthesize()
            .dispose();

          expect(Klass.prototype.foo).toBe(foo);
        });

        it('returns the IoCContainer instance', function() {
          expect(ioc.dispose()).toBe(ioc);
        });
      });

      describe('::flush', function() {
        it('resets all known origins by default', function() {
          var foo = function(){};
          Klass.prototype.foo = foo;

          ioc
            .inject(Klass, {foo: function() {}})
            .synthesize()
            .flush();

          expect(Klass.prototype.foo).toBe(foo);
        });

        it('resets specific origins by selected reflections', function() {
          var foo = function(){};
          Klass.prototype.foo = foo;

          var Klass2 = function(){};
          var bar = function(){};
          Klass2.prototype.bar = bar;

          ioc
            .inject(Klass, {foo: function() {}})
            .inject(Klass2, {bar: function() {}})
            .synthesize()
            .flush(ioc.getReflectionsOf(Klass2));

          expect(
            Klass.prototype.foo !== foo &&
            Klass2.prototype.bar === bar
          ).toBe(true);
        });

        it('won`t reset origins if unknown', function() {
          var foo = function(){};
          Klass.prototype.foo = foo;

          ioc
            .inject(Klass, {foo: function() {}})
            .synthesize()
            .flush([{}]);

          expect(Klass.prototype.foo).not.toBe(foo);
        });

        it('removes all known reflections by default', function() {
          ioc
            .inject(Klass, {})
            .synthesize()
            .flush();

          expect(ioc.isReflection(Klass)).toBe(false);
        });

        it('removes specific reflections by selected reflections', function() {
          var Klass2 = function(){};

          ioc
            .inject(Klass, {})
            .inject(Klass2, {})
            .synthesize()
            .flush(ioc.getReflectionsOf(Klass2));

          expect(
            ioc.isReflection(Klass) &&
            !ioc.isReflection(Klass2)
          ).toBe(true);
        });

        it('won`t remove reflections if unknown', function() {
          ioc
            .inject(Klass, {})
            .synthesize()
            .flush([{}]);

          expect(ioc.isReflection(Klass)).toBe(true);
        });

        it('returns the IoCContainer instance', function() {
          expect(ioc.flush()).toBe(ioc);
        });
      });
    });
  });
});
