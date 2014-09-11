ioc-container
=============

A prototype based solution to perform Dependency Injection concepts in javascript.
This one goes out for all singleton denier.

## grunt tasks

~~~bash
# api docs
grunt jsdoc
~~~

~~~bash
# code coverage
grunt coverage-report
~~~

## use cases

### jasmine

When I want to test an instance behaviour that delegates to another class instance.

~~~js

// -- class setup

/*
 * var MyClass = function(){ this._transitiveDep = new OtherClass(); };
 * MyClass.prototype.command = function(value) {
 *   this._transitiveDep.delegate(value);
 * });
 */

// -- test scope

var instance, ioc, spy;

beforeEach(function() {
  spy = jasmine.createSpy('delegate-call');
  
  ioc = new IoCContainer()
    .inject(OtherClass, {
      delegate: spy
    })
    .synthesize();
    
  instance = new MyClass();
});

afterEach(function() {
  ioc.dispose();
});

it('calls OtherClass.delegate on MyClass.command', function() {
  instance.command('foo');
  expect(spy).toHaveBeenCalledWith('foo');
});

### AB Tests

An easy way to implement differnt behaviour in an applicationr runtime.
The scope property allows you to apply multiple reflections of the same class.
Simply use `switchScope` before injection, see docs.

~~~

## idea

It takes the prototype of a class - `origin` - and can create multiple prototypes with
modifications - `reflections` - of it. The reflections are controlled by a `scope`
identifier and became applied to a class. When instantiating a class and calling a
method, the reflection is targeted by the scope and became executed.

It is possible to inject properties and methods on classes (and instances of classes).
On instances, the prototpye of class is used for further injections. Properties are
not cloned. Runtime modifications on an array or a literal, will affect all prototypes
sharing the same property reference. Methods got access to the origin prototype,
to allow polymorphism.

~~~js
var Klass = function(){};
Klass.prototype.fn = function(){ return 'default-' + this.prop; };
Klass.prototype.prop = 'foo';

var inst_ioc, inst = new Klass();
var ioc = new IoCContainer();
ioc
  .switchScope('myScope') //create a new scope
  .inject(Klass, { //injections
    fn: function() { return 'injected-' + this.prop; },
      prop: 'bar'
    }})
  .synthesize(); //switch to myScope reflection

inst_ioc = new Klass();
console.log(inst.fn()); //returns 'default-foo'
console.log(inst_ioc.fn()); //returns 'inejected-bar'

ioc.dispose(); //remove reflections
console.log(new Klass().fn()); //returns 'default-foo'
~~~
