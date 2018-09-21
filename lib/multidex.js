/// Multidex: Tiny key-value store supporting fast access by multiple keys.
/// Copyright (c) 2017 Chris White.  CC-BY 4.0 International.

// The multidex holds uniform values, each of which is a POD having the same
// fields as all other values.  Fields can be keys or other fields.  Each
// key field is indexed.  For example:
//
//     let store = Multidex(['key1','key2'],['other1','other2']);
//     store.add({key1: 42, key2: 'foo', other1: "Don't Panic"});
//          // returns the new POD
//     store.by_key1(42);       // <-- returns the POD we just added
//     store.by_key2('foo');    // <-- ditto
//     store.by_key1(42,'other1')   // <-- "Don't Panic" --- a shorthand
//     let foo = store.by_key1(42);
//     foo.key1 === 42;     // true
//     foo.key2 === 'foo'   // true
//     foo.other1 === "Don't Panic"     // true
//
//     store.remove_value(foo);     // Have to remove by value, not by key.
//     store.by_key1(42);   // <-- undefined, since we removed _foo_.
//
// Caution: If you change the indices in a value, the by_* accessors will
// no longer work as they should.  Instead, use change_key():
//
//     store.change_key(foo, 'key1', 84);
//     store.by_key1(84)    // foo
//
// You can give values a type tag, accessible as <val>.ty, by passing a
// string as the first parameter of Multidex.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define('multidex',factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.Multidex = factory();
    }
}(this, function () {

    // Prefixes for field names
    const IDX = '_idx_';
    const ACC = 'by_';      // accessor

    // Key to hold a value's "name," i.e., unique id
    const VNAME = Symbol('value_name');

    // Current value name
    let Value_name = 1;     // always truthy (unless you wrap around)

    // Cache for prototypes, one per set of key names.
    let Protos = {};

    // --- General helpers ---

    // Give a value a meaningful toString so we can use it as a hash key.
    function value_toString()
    {
        if(VNAME in this) {
            return this[VNAME];                 // Normal case
        } else {
            console.log('No value_name!');
            console.log(this);
            return JSON.stringify(this);        // Fallback
        }
    } //value_toString

    /// Make a plain-old-data hash with the given keys.  Each key initially
    /// has the value null.
    function make_value(field_names, ty_string)
    {
        let retval = Object.create(null);

        // Name the value
        retval[VNAME] = Value_name.toString();
        ++Value_name;

        // TODO? move toString and ty to a prototype?

        // toString so it can be used as a hash key
        Object.defineProperty(retval, 'toString', {
            configurable: false
          , enumerable: false
          , value: value_toString
          , writable: false
        });

        // Object type
        Object.defineProperty(retval, 'ty',  {
            configurable: false,
            enumerable: true,
            value: ty_string || '',
            writable: false,
        });

        // Data fields
        for(let key_name of field_names) {
            Object.defineProperty(retval, key_name,  {
                configurable: false
              , enumerable: true
              , value: null
              , writable: true
            });
        }

        return Object.seal(retval);     // No new keys can be added.
    } //make_value

    /// Make a new multidex and return it.
    /// @param type_string {optional string} If provide, a value to put in
    ///                     the `ty` field of values.
    /// @param key_names {string, or array of string} Names of key field(s)
    ///                     in a value
    /// @param other_names {optional string or array of string}
    ///                     Names of non-key fields in a value.
    /// TODO permit the caller to specify functions to be added to the
    /// value prototype.
    /// @return The new multidex, or null on failure.
    function ctor()     //([type string, ]key_names [, other_names])
    {
        let ty_string;
        let key_names;
        let other_names;

        // Unpack the arguments
        let arg0_is_string = arguments.length >= 1 && typeof arguments[0] === 'string';
        switch(arguments.length) {
            case 1:
                if(!arg0_is_string) key_names = arguments[0];
                other_names = [];
                break;

            case 2:
                if(arg0_is_string) {
                    ty_string = arguments[0];
                    key_names = arguments[1];
                    other_names = [];
                } else {
                    key_names = arguments[0];
                    other_names = arguments[1];
                }
                break;

            case 3:
                ty_string = arguments[0];
                key_names = arguments[1];
                other_names = arguments[2];
                break;

            default:
                break
        }

        // Check the arguments
        if(typeof key_names === 'string') key_names = [key_names];
        if(typeof other_names === 'string') other_names = [other_names];

        if(!Array.isArray(key_names)) return null;   //TODO better error reporting
        if(!Array.isArray(other_names)) return null;   //TODO better error reporting
        let all_names = key_names.concat(other_names);
        if(!ty_string) ty_string = '';  //regularize

        // Instance functions

        let proto_key = JSON.stringify({ty: ty_string, names: all_names});
        if(!(proto_key in Protos)) {    // Need to make the instance functions

            /// Make a new value for storage.  Does not add the value
            /// to the multidex.
            function new_value() { return make_value(all_names, ty_string); }

            /// Copy the fields of an existing value.  Does not add the new
            /// value to the multidex.
            function clone_value(other)
            {
                let retval = this.new_value();
                for(let key_name of all_names) {
                    retval[key_name] = other[key_name];
                }
                return retval;
            }  //clone_value

            /// Remove a value from the multidex.
            function remove_value(val)
            {
                if(!(val in this.all_values)) return;
                delete this.all_values[val];
                for(let key_name of key_names) {    // Remove from indices
                    delete this[IDX+key_name][val[key_name]];
                }
            } //remove_value

            /// Add a value created with new_value() or clone_value() to the
            /// multidex.  Overwrites index entries for any key fields.
            /// @return The new value
            function add_value(val)
            {
                this.remove_value(val);  // just in case
                this.all_values[val] = val;
                for(let key_name of key_names) {    // Add to indices
                    this[IDX+key_name][val[key_name]] = val;
                }
                return val;
            } //add_value

            /// Create a new value using the given data and add the new
            /// value to the multidex.
            /// @return The new value
            function add(new_data)
            {
                let val = this.new_value();
                for(let field_name of all_names) {
                    if(field_name in new_data)
                        val[field_name] = new_data[field_name];
                }
                return this.add_value(val);
            } //add

            /// Change a key in a value, and update the indices
            /// @return The value, for chaining
            function change_key(val, key_name, new_value)
            {
                if(!(val in this.all_values)) return;
                delete this[IDX+key_name][val[key_name]];   // rm old index
                val[key_name] = new_value;                  // mutate val
                this[IDX+key_name][new_value] = val;        // add new index
                return val;
            } //change_key

            // The prototype
            let this_proto = {
                new_value,
                clone_value,
                remove_value,
                add_value,
                add,
                change_key,
                ty: ty_string
            }; //this_proto

            // by_* accessors for the keys.
            //  - With one argument, returns the value if the key is in the
            //      pertinent index, else returns undefined.
            //  - With two arguments, returns the value if the key is in the
            //      pertinent index and the field named in the second argument
            //      exists in the value, else undefined.
            for(let key_name of key_names) {
                this_proto[ACC + key_name] =
                    (function(key_val, field_name=null) {
                        let idx = this[IDX+key_name];
                        if(!(key_val in idx)) {
                            return undefined;
                        }
                        let val = idx[key_val];

                        if( (field_name == null) ||
                            (typeof field_name === 'undefined') ) {
                            return val;
                        } else if(field_name in val) {
                            return val[field_name];
                        } else {
                            return undefined;
                        }
                    });
            }

            Protos[proto_key] = Object.seal(this_proto);

        } //endif needed to create proto

        // Create the instance data
        let retval = Object.create(Protos[proto_key]);

        retval.all_values={};   // Map from values to themselves.

        // Create indices
        for(let key_name of key_names) {
            retval[IDX + key_name] = {};
        }

        return Object.seal(retval);  // the new multidex

    } //ctor

    return ctor;
}));

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/
// Thanks for information about `this` to Kyle Simpson,
// https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
