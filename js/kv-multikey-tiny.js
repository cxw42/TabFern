/// Tiny key-value store supporting access by multiple keys.
/// Copyright (c) 2017 Chris White.  CC-BY 4.0 International.

// The store holds uniform values, each of which is a POD having the same
// fields as all other values.  Fields can be keys or other fields.  Each
// key field is indexed.  For example:
//
//     let store = Multikey(['key1','key2'],['other1','other2']);
//     store.add({key1: 42, key2: 'foo', other1: "Don't Panic"});
//          // returns the new POD
//     store.by_key1(42);       // <-- returns the POD we just added
//     store.by_key2('foo');    // <-- ditto
//     let foo = store.by_key1(42);
//     foo.key1 === 42;     // true
//     foo.key2 === 'foo'   // true
//     foo.other1 === "Don't Panic"     // true
//
//     store.remove_value(foo);     // Have to remove by value, not by key.
//     store.by_key1(42);   // <-- undefined, since we removed _foo_.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.Multikey = factory(root.jQuery);
    }
}(this, function ($) {

    // Prefixes for field names
    const IDX = '_idx_';
    const ACC = 'by_';      // accessor

    // Cache for prototypes, one per set of key names.
    let Protos = {};

    // --- General helpers ---

    /// Make a plain-old-data hash with the given keys.  Each key initially
    /// has the value null.
    function make_pod(field_names)
    {
        let retval = Object.create(null);

        // Give it a meaningful toString so we can use it as a hash key.
        Object.defineProperty(retval, 'toString', {
            configurable: false
          , enumerable: false
          , value: function() { return JSON.stringify(this); }
          , writable: false
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
    } //make_pod

    /// Make a new store and return it.
    function ctor(key_names, other_names=[])
    {
        if(!Array.isArray(key_names)) return null;   //TODO better error reporting
        if(!Array.isArray(other_names)) return null;   //TODO better error reporting
        let all_names = key_names.concat(other_names);

        // Instance functions

        let proto_key = JSON.stringify(all_names);
        if(!(proto_key in Protos)) {    // Need to make the instance functions

            /// Make a new value for storage.  Does not add the value
            /// to the store.
            function new_value() { return make_pod(all_names); }

            /// Copy the fields of an existing value.  Does not add the new
            /// value to the store.
            function clone_value(other)
            {
                let retval = this.new_value();
                for(let key_name of all_names) {
                    retval[key_name] = other[key_name];
                }
                return retval;
            }  //clone_value

            /// Remove a value from the store.
            function remove_value(val)
            {
                if(!(val in this.all_values)) return;
                delete this.all_values[val];
                for(let key_name of key_names) {    // Remove from indices
                    delete this[IDX+key_name][val[key_name]];
                }
            } //remove_value

            /// Add a value created with new_value or clone_value to the store.
            /// Overwrites index entries for any key fields.
            function add_value(val)
            {
                this.remove_value(val);  // just in case
                this.all_values[val] = val;
                for(let key_name of key_names) {    // Add to indices
                    this[IDX+key_name][val[key_name]] = val;
                }
            } //add_value

            /// Create a new value using the given data and add the new
            /// value to the store.  Returns the new value.
            function add(new_data)
            {
                let val = this.new_value();
                for(let field_name of all_names) {
                    if(field_name in new_data)
                        val[field_name] = new_data[field_name];
                }
                this.add_value(val);
                return val;
            } //add

            // The prototype
            let fns = {
                new_value
              , clone_value
              , remove_value
              , add_value
              , add
            }; //fns

            // by_* accessors for the keys
            for(let key_name of key_names) {
                fns[ACC + key_name] =
                    (function(key_val) {
                        let idx = this[IDX+key_name];
                        return idx[key_val];
                    });
            }

            Protos[proto_key] = Object.seal(fns);

        } //endif needed to create proto

        // Create the instance data
        let retval = Object.create(Protos[proto_key]);

        retval.all_values={};   // Map from values to themselves.

        // Create indices
        for(let key_name of key_names) {
            retval[IDX + key_name] = {};
        }

        return Object.seal(retval);  // the new store

    } //ctor

    return ctor;
}));

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/
// Thanks for information about `this` to Kyle Simpson,
// https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
