/**
 * ### Multitype plugin
 *
 * Makes it possible to add predefined types for groups of nodes,
 * which make it possible to easily control nesting rules and icon
 * for each group.
 * Each node can have multiple types at once.
 *
 * Modified by cxw42 from jstree.types.js by vakata.
 */
/*globals jQuery, define, exports, require */
(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define('jstree-multitype',['jquery','jstree'], factory);
    }
    else if(typeof exports === 'object') {
        factory(require('jquery'), require('lib/jstree'));
    }
    else {
        factory(jQuery, jQuery.jstree);
    }
}(function ($, _jstree_unused, undefined) {
    "use strict";

    if($.jstree.plugins.multitype) { return; }

    /**
     * An object storing all types as key-value pairs.
     *
     *	types: {
     *			custom_icon: { icon: 'my-own-icon' },
     *			some_attrs: { li_attr: 'my-li', a_attr: 'my-a' },
     *			custom_color: { li_attr: 'style-blue' },
     *	}
     *
     * The key is the multitype name and the value is
     * an object that could contain following keys (all optional).
     *
     * Each node can have any number of multitypes.  In case of conflicts,
     * e.g., of icon, later multitypes control.
     *
//	 * * `max_children` the maximum number of immediate children this node
//	 * 		multitype can have. Do not specify or set to `-1` for unlimited.
//	 * * `max_depth` the maximum number of nesting this node multitype can
//	 * 		have. A value of `1` would mean that the node can have children,
//	 * 		but no grandchildren. Do not specify or set to `-1` for unlimited.
//	 * * `valid_children` an array of node multitype strings, that nodes
//	 * 		of this multitype can have as children. Do not specify or set
//	 * 		to `-1` for no limits.
     * * `icon` a string - can be a path to an icon or a className, if
     * 		using an image that is in the current directory use a `./`
     * 		prefix, otherwise it will be detected as a class. Omit to use the
     * 		default icon from your theme.
     * * `li_attr` an object of values which will be used to add HTML
     * 		attributes on the resulting LI DOM node (merged with the node's
     * 		own data)
     * * `a_attr` an object of values which will be used to add HTML attributes
     *		on the resulting A DOM node (merged with the node's own data)
     *
     * There are no predefined or default multitypes
     *
     * @name $.jstree.defaults.multitype
     * @plugin multitype
     */
    $.jstree.defaults.multitype = { };

    $.jstree.plugins.multitype = function (options, parent) {

// I don't think we need this since we don't have defaults
//		this.init = function (el, options) {
//			var i, j;
//			if(options && options.multitype && options.multitype['default']) {
//				for(i in options.types) {
//					if(i !== "default" && i !== $.jstree.root && options.multitype.hasOwnProperty(i)) {
//						for(j in options.multitype['default']) {
//							if(options.multitype['default'].hasOwnProperty(j) && options.multitype[i][j] === undefined) {
//								options.multitype[i][j] = options.multitype['default'][j];
//							}
//						}
//					}
//				}
//			}
//			parent.init.call(this, el, options);
//			this._model.data[$.jstree.root].multitype = $.jstree.root;
//		};

// I don't think we need this since we don't have the '#' type
//		this.refresh = function (skip_loading, forget_state) {
//			parent.refresh.call(this, skip_loading, forget_state);
//			this._model.data[$.jstree.root].multitype = $.jstree.root;
//		};

        this.bind = function () {
            this.element
                .on('model.jstree', $.proxy(function (e, data) {
                        var m = this._model.data,
                            dpc = data.nodes,	///< aray of node IDs
                            t = this.settings.multitype,
                            i, j;	//, c = 'default',
                        var k;
                        var cs;		///< array of classes to add, one for each type set
                        var typeset_idx;

                        NODE: for(i = 0, j = dpc.length; i < j; i++) {

                            m[dpc[i]].multitype = [];

                            // `original` holds the node's state when it was first loaded,
                            // e.g., as provided as the `data` to the jstree() call.
                            if(m[dpc[i]].original && m[dpc[i]].original.multitype) {
                                // && t[m[dpc[i]].original.multitype]
                                //c = m[dpc[i]].original.multitype;
                                cs = m[dpc[i]].original.multitype;
                            }

                            // Not sure what this is --- maybe backwards compatibility?
                            if(m[dpc[i]].data && m[dpc[i]].data.jstree && m[dpc[i]].data.jstree.multitype) {
                             //	&& t[m[dpc[i]].data.jstree.multitype]
                                //c = m[dpc[i]].data.jstree.multitype;
                                cs = m[dpc[i]].data.jstree.multitype;
                            }

                            if(!cs) cs = [];		//default: no types
                            else if(!$.isArray(cs)) cs = [cs];

                            // Make sure each multitype is known
                            for(let ty of cs) {
                                if(!t[ty]) continue NODE;
                            }

                            m[dpc[i]].multitype = cs;	//c;

                            // Apply each type in order
                            for(var cidx=0; cidx < cs.length; ++cidx) {
                                var c = cs[cidx];

                                if(t[c].icon !== undefined) {
                                    m[dpc[i]].icon = t[c].icon;		// Later icon assignments override earlier
                                }

                                if(t[c].li_attr !== undefined && typeof t[c].li_attr === 'object') {
                                    for (k in t[c].li_attr) {
                                        if (t[c].li_attr.hasOwnProperty(k)) {
                                            if (k === 'id') {
                                                continue;
                                            }
                                            else if (k === 'class') {
                                                m[dpc[i]].li_attr['class'] = t[c].li_attr['class'] + ' ' + m[dpc[i]].li_attr['class'];
                                            }
                                            else {	//later assignments override earlier
                                                m[dpc[i]].li_attr[k] = t[c].li_attr[k];
                                            }
                                        }
                                    }
                                } //endif t[c] has li_attr

                                if(t[c].a_attr !== undefined && typeof t[c].a_attr === 'object') {
                                    for (k in t[c].a_attr) {
                                        if (t[c].a_attr.hasOwnProperty(k)) {
                                            if (k === 'id') {
                                                continue;
                                            }
                                            else if (k === 'class') {
                                                m[dpc[i]].a_attr['class'] = t[c].a_attr['class'] + ' ' + m[dpc[i]].a_attr['class'];
                                            }
                                            else {	//later assignments override earlier
                                                m[dpc[i]].a_attr[k] = t[c].a_attr[k];
                                            }
                                        }
                                    }
                                } //endif t[c] has a_attr

                            } //cidx

                        } //foreach node
                        //m[$.jstree.root].multitype = $.jstree.root;
                    }, this));
            parent.bind.call(this);
        };

        this.get_json = function (obj, options, flat) {
            var i, j,
                m = this._model.data,
                opt = options ? $.extend(true, {}, options, {no_id:false}) : {},
                tmp = parent.get_json.call(this, obj, opt, flat);
            if(tmp === false) { return false; }
            if($.isArray(tmp)) {
                for(i = 0, j = tmp.length; i < j; i++) {
                    tmp[i].multitype = tmp[i].id && m[tmp[i].id] && m[tmp[i].id].multitype ? m[tmp[i].id].multitype : "default";
                    if(options && options.no_id) {
                        delete tmp[i].id;
                        if(tmp[i].li_attr && tmp[i].li_attr.id) {
                            delete tmp[i].li_attr.id;
                        }
                        if(tmp[i].a_attr && tmp[i].a_attr.id) {
                            delete tmp[i].a_attr.id;
                        }
                    }
                }
            }
            else {
                tmp.multitype = tmp.id && m[tmp.id] && m[tmp.id].multitype ? m[tmp.id].multitype : "default";
                if(options && options.no_id) {
                    tmp = this._delete_ids(tmp);
                }
            }
            return tmp;
        };

        this._delete_ids = function (tmp) {
            if($.isArray(tmp)) {
                for(var i = 0, j = tmp.length; i < j; i++) {
                    tmp[i] = this._delete_ids(tmp[i]);
                }
                return tmp;
            }
            delete tmp.id;
            if(tmp.li_attr && tmp.li_attr.id) {
                delete tmp.li_attr.id;
            }
            if(tmp.a_attr && tmp.a_attr.id) {
                delete tmp.a_attr.id;
            }
            if(tmp.children && $.isArray(tmp.children)) {
                tmp.children = this._delete_ids(tmp.children);
            }
            return tmp;
        };

// Leave this out for now
//		this.check = function (chk, obj, par, pos, more) {
//			if(parent.check.call(this, chk, obj, par, pos, more) === false) { return false; }
//			obj = obj && obj.id ? obj : this.get_node(obj);
//			par = par && par.id ? par : this.get_node(par);
//			var m = obj && obj.id ? (more && more.origin ? more.origin : $.jstree.reference(obj.id)) : null, tmp, d, i, j;
//			m = m && m._model && m._model.data ? m._model.data : null;
//			switch(chk) {
//				case "create_node":
//				case "move_node":
//				case "copy_node":
//					if(chk !== 'move_node' || $.inArray(obj.id, par.children) === -1) {
//						tmp = this.get_rules(par);
//						if(tmp.max_children !== undefined && tmp.max_children !== -1 && tmp.max_children === par.children.length) {
//							this._data.core.last_error = { 'error' : 'check', 'plugin' : 'multitype', 'id' : 'types_01', 'reason' : 'max_children prevents function: ' + chk, 'data' : JSON.stringify({ 'chk' : chk, 'pos' : pos, 'obj' : obj && obj.id ? obj.id : false, 'par' : par && par.id ? par.id : false }) };
//							return false;
//						}
//						if(tmp.valid_children !== undefined && tmp.valid_children !== -1 && $.inArray((obj.multitype || 'default'), tmp.valid_children) === -1) {
//							this._data.core.last_error = { 'error' : 'check', 'plugin' : 'multitype', 'id' : 'types_02', 'reason' : 'valid_children prevents function: ' + chk, 'data' : JSON.stringify({ 'chk' : chk, 'pos' : pos, 'obj' : obj && obj.id ? obj.id : false, 'par' : par && par.id ? par.id : false }) };
//							return false;
//						}
//						if(m && obj.children_d && obj.parents) {
//							d = 0;
//							for(i = 0, j = obj.children_d.length; i < j; i++) {
//								d = Math.max(d, m[obj.children_d[i]].parents.length);
//							}
//							d = d - obj.parents.length + 1;
//						}
//						if(d <= 0 || d === undefined) { d = 1; }
//						do {
//							if(tmp.max_depth !== undefined && tmp.max_depth !== -1 && tmp.max_depth < d) {
//								this._data.core.last_error = { 'error' : 'check', 'plugin' : 'multitype', 'id' : 'types_03', 'reason' : 'max_depth prevents function: ' + chk, 'data' : JSON.stringify({ 'chk' : chk, 'pos' : pos, 'obj' : obj && obj.id ? obj.id : false, 'par' : par && par.id ? par.id : false }) };
//								return false;
//							}
//							par = this.get_node(par.parent);
//							tmp = this.get_rules(par);
//							d++;
//						} while(par);
//					}
//					break;
//			}
//			return true;
//		};

//		/**
//		 * used to retrieve the multitype settings object for a node
//		 * @name get_rules(obj)
//		 * @param {mixed} obj the node to find the rules for
//		 * @return {Object}
//		 * @plugin multitype
//		 */
//		this.get_mt_rules = function (obj) {
//			obj = this.get_node(obj);
//			if(!obj) { return false; }
//			var tmp = this.get_multitype(obj, true);
////			if(tmp.max_depth === undefined) { tmp.max_depth = -1; }
////			if(tmp.max_children === undefined) { tmp.max_children = -1; }
////			if(tmp.valid_children === undefined) { tmp.valid_children = -1; }
//			return tmp;
//		};

        /**
         * used to retrieve the multitype string or settings object for a node
         * @name get_multitype(obj [, rules])
         * @param {mixed} obj the node to find the rules for
         * @return {array}
         * @plugin multitype
         */
        this.get_multitype = function (obj) {
            obj = this.get_node(obj);
            return (!obj) ? false : obj.multitype;
        };

        /**
         * add a multitype to a node, at the end of the list.  This means
         * the new type's icon will replace those specified by other types.
         * @name set_multitype(obj, multitype)
         * @param {mixed} obj the node to change
         * @param {String} multitype the new multitype
         * @plugin multitype
         */
        this.add_multitype = function (obj, new_multitype) {
            var m = this._model.data, t, t1, t2, old_icon, k, d, a;
            if(typeof new_multitype !== 'string') return false;

            if($.isArray(obj)) {
                obj = obj.slice();
                for(t1 = 0, t2 = obj.length; t1 < t2; t1++) {
                    this.add_multitype(obj[t1], new_multitype);
                }
                return true;
            }

            t = this.settings.multitype;
            obj = this.get_node(obj);
            //if(!t[multitype] || !obj) { return false; }
            if(!obj) { return false; }
            let tyidx = obj.multitype.indexOf(new_multitype);
            if(tyidx !== -1) return true;
                // Already there - don't add it again

            d = this.get_node(obj, true);

            if (d && d.length) {
                a = d.children('.jstree-anchor');
            }

            obj.multitype.push(new_multitype);

            // Set the icon
            if(t[new_multitype].icon !== undefined) {
                this.set_icon(obj, t[new_multitype].icon);
            } //endif this multitype was controlling the icon

            // add new props
            if(t[new_multitype].li_attr !== undefined && typeof t[new_multitype].li_attr === 'object') {
                for (k in t[new_multitype].li_attr) {
                    if (t[new_multitype].li_attr.hasOwnProperty(k)) {
                        if (k === 'id') {
                            continue;
                        }
                        else if (m[obj.id].li_attr[k] === undefined) {
                            m[obj.id].li_attr[k] = t[new_multitype].li_attr[k];
                            if (d) {
                                if (k === 'class') {
                                    d.addClass(t[new_multitype].li_attr[k]);
                                }
                                else {
                                    d.attr(k, t[new_multitype].li_attr[k]);
                                }
                            }
                        }
                        else if (k === 'class') {
                            m[obj.id].li_attr['class'] = t[new_multitype].li_attr[k] + ' ' + m[obj.id].li_attr['class'];
                            if (d) { d.addClass(t[new_multitype].li_attr[k]); }
                        }
                    }
                }
            } //endif new_multitype specifies li_attr

            if(t[new_multitype].a_attr !== undefined && typeof t[new_multitype].a_attr === 'object') {
                for (k in t[new_multitype].a_attr) {
                    if (t[new_multitype].a_attr.hasOwnProperty(k)) {
                        if (k === 'id') {
                            continue;
                        }
                        else if (m[obj.id].a_attr[k] === undefined) {
                            m[obj.id].a_attr[k] = t[new_multitype].a_attr[k];
                            if (a) {
                                if (k === 'class') {
                                    a.addClass(t[new_multitype].a_attr[k]);
                                }
                                else {
                                    a.attr(k, t[new_multitype].a_attr[k]);
                                }
                            }
                        }
                        else if (k === 'href' && m[obj.id].a_attr[k] === '#') {
                            m[obj.id].a_attr['href'] = t[new_multitype].a_attr['href'];
                            if (a) { a.attr('href', t[new_multitype].a_attr['href']); }
                        }
                        else if (k === 'class') {
                            m[obj.id].a_attr['class'] = t[new_multitype].a_attr['class'] + ' ' + m[obj.id].a_attr['class'];
                            if (a) { a.addClass(t[new_multitype].a_attr[k]); }
                        }
                    }
                }
            } //endif new_multitype specifies a_attr

            return true;
        }; //add_multitype()

        /**
         * remove a multitype from a node
         * @name set_multitype(obj, multitype)
         * @param {mixed} obj the node to change
         * @param {String} multitype the new multitype
         * @plugin multitype
         */
        this.del_multitype = function (obj, which_multitype) {
            var m = this._model.data, t, t1, t2, old_icon, k, d, a;
            if(typeof which_multitype !== 'string') return false;

            if($.isArray(obj)) {
                obj = obj.slice();
                for(t1 = 0, t2 = obj.length; t1 < t2; t1++) {
                    this.del_multitype(obj[t1], which_multitype);
                }
                return true;
            }

            t = this.settings.multitype;
            obj = this.get_node(obj);
            //if(!t[multitype] || !obj) { return false; }
            if(!obj) { return false; }
            let tyidx = obj.multitype.indexOf(which_multitype);
            if(tyidx === -1) return true;
                // Already gone - don't remove it again

            obj.multitype.splice(tyidx,1);	// Remove it from the node

            d = this.get_node(obj, true);
            if (d && d.length) {
                a = d.children('.jstree-anchor');
            }

            // If this multitype was controlling the icon, clear it and
            // take any other icon specified.
            old_icon = this.get_icon(obj);
            if(t[which_multitype].icon !== undefined && old_icon === t[which_multitype].icon) {
                let new_icon = true;
                // Loop down, since later multitypes control
                for(let idx=obj.multitype.length-1; idx>=0 ; --idx) {
                    if(t[obj.multitype[idx]].icon !== undefined) {
                        new_icon = t[obj.multitype[idx]].icon;
                        break;
                    }
                }
                this.set_icon(obj, new_icon);
            } //endif this multitype was controlling the icon

            // remove old multitype props
            if(t[which_multitype] && t[which_multitype].li_attr !== undefined && typeof t[which_multitype].li_attr === 'object') {
                for (k in t[which_multitype].li_attr) {
                    if (t[which_multitype].li_attr.hasOwnProperty(k)) {

                        if (k === 'id') {
                            continue;
                        }
                        else if (k === 'class') {
                            // TODO? handle each class listed in the string separately?
                            m[obj.id].li_attr['class'] = (m[obj.id].li_attr['class'] || '').replace(t[which_multitype].li_attr[k], '');
                            if (d) { d.removeClass(t[which_multitype].li_attr[k]); }
                        }
                        else if (m[obj.id].li_attr[k] === t[which_multitype].li_attr[k]) {
                            delete m[obj.id].li_attr[k];
                            if (d) { d.removeAttr(k); }

                            // Iterate down the remaining types to find a new value for this attribute
                            for(let idx=obj.multitype.length-1; idx>=0 ; --idx) {
                                let ty = t[obj.multitype[idx]];
                                if(ty && ty.li_attr && ty.li_attr[k] !== undefined) {
                                    m[obj.id].li_attr[k] = t[obj.multitype[idx]].li_attr[k];
                                    if(d) { d.attr(k, t[obj.multitype[idx]].li_attr[k]); }
                                    break;
                                }
                            }

                        }

                    }
                }
            } //endif type has li_attr

            if(t[which_multitype] && t[which_multitype].a_attr !== undefined && typeof t[which_multitype].a_attr === 'object') {
                for (k in t[which_multitype].a_attr) {
                    if (t[which_multitype].a_attr.hasOwnProperty(k)) {
                        if (k === 'id') {
                            continue;
                        }
                        else if (k === 'class') {
                            m[obj.id].a_attr['class'] = (m[obj.id].a_attr['class'] || '').replace(t[which_multitype].a_attr[k], '');
                            if (a) { a.removeClass(t[which_multitype].a_attr[k]); }
                        }
                        else if (m[obj.id].a_attr[k] === t[which_multitype].a_attr[k]) {
                            if (k === 'href') {
                                m[obj.id].a_attr[k] = '#';
                                if (a) { a.attr('href', '#'); }
                            }
                            else {
                                delete m[obj.id].a_attr[k];
                                if (a) { a.removeAttr(k); }
                            }

                            // Iterate down the remaining types to find a new value for this attribute
                            for(let idx=obj.multitype.length-1; idx>=0 ; --idx) {
                                let ty = t[obj.multitype[idx]];
                                if(ty && ty.a_attr && ty.a_attr[k] !== undefined) {
                                    m[obj.id].a_attr[k] = t[obj.multitype[idx]].a_attr[k];
                                    if(a) { a.attr(k, t[obj.multitype[idx]].a_attr[k]); }
                                    break;
                                }
                            }

                        }
                    }
                }
            } //endif type has a_attr

            return true;
        }; //del_multitype()

        /**
         * check whether a node has a multitype
         * @name has_multitype(obj, multitype)
         * @param {mixed} obj the node
         * @param {String} multitype the multitype
         * @return {Boolean} true/false, or null if unknown or error
         * @plugin multitype
         */
        this.has_multitype = function (obj, multitype) {
            if(typeof multitype !== 'string') return null;
            obj = this.get_node(obj);
            if(!obj) { return null; }
            return (obj.multitype.indexOf(multitype) !== -1);
        }; //has_multitype()

        /**
         * set the node icon for a node (override)
         * @name set_icon(obj, icon)
         * @param {mixed} obj
         * @param {String} icon the new icon - can be a path to an icon or a className, if using an image that is in the current directory use a `./` prefix, otherwise it will be detected as a class
         */
        this.set_icon = function (obj, icon) {

            if($.isArray(obj)) {
                obj = obj.slice();
                for(t1 = 0, t2 = obj.length; t1 < t2; t1++) {
                    this.set_icon(obj[t1], icon);
                }
                return true;
            }

            obj = this.get_node(obj);
            if(!obj || obj.id === $.jstree.root) { return false; }

            let new_icon = (icon === true || icon === null || icon === undefined ||
                        icon === '') ? true : icon;

      if(new_icon === true) { // default icon --- see if one from a multitype should take effect
              let t = this.settings.multitype;

                // Loop down, since later multitypes control
                for(let idx=obj.multitype.length-1; idx>=0 ; --idx) {
                    if(t[obj.multitype[idx]].icon !== undefined) {
                        new_icon = t[obj.multitype[idx]].icon;
                        break;
                    }
                }
      }

      return parent.set_icon.call(this,obj,new_icon);
    }; //set_icon()

    };
}));
// vi: set ts=2 sw=2: //
