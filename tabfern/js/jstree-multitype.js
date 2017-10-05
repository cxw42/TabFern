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
		define(['jquery','jstree'], factory);
	}
	else if(typeof exports === 'object') {
		factory(require('jquery'), require('jstree'));
	}
	else {
		factory(jQuery, jQuery.jstree);
	}
}(function ($, jstree, undefined) {
	"use strict";

	if($.jstree.plugins.multitype) { return; }

	/**
	 * An object storing all types under "types" as an array of objects of 
	 * key value pairs.  Sets of types are offsets in the array: 0, 1, ... .
	 * Each node can have one type from each set at any given time.  E.g.:
	 *
	 *	{ types: [
	 *		{	// choices for type set 0
	 *			custom_icon: { icon: 'my-own-icon' },
	 *			some_attrs: { li_attr: 'my-li', a_attr: 'my-a' }
	 *		},
	 *		{	// choices for type set 1
	 *			custom_color: { li_attr: 'style-blue' },
	 *			some_attrs: { li_attr: 'other-li', a_attr: 'other-a' }
	 *		},
	 *	]}
	 *
	 * In each type set, the key is the multitype name and the value is 
	 * an object that could contain following keys (all optional).
	 *
	 * * `max_children` the maximum number of immediate children this node 
	 * 		multitype can have. Do not specify or set to `-1` for unlimited.
	 * * `max_depth` the maximum number of nesting this node multitype can 
	 * 		have. A value of `1` would mean that the node can have children, 
	 * 		but no grandchildren. Do not specify or set to `-1` for unlimited.
	 * * `valid_children` an array of node multitype strings, that nodes 
	 * 		of this multitype can have as children. Do not specify or set 
	 * 		to `-1` for no limits.
	 * * `icon` a string - can be a path to an icon or a className, if 
	 * 		using an image that is in the current directory use a `./` 
	 * 		prefix, otherwise it will be detected as a class. Omit to use the 
	 * 		default icon from your theme.
	 * * `li_attr` an object of values which will be used to add HTML 
	 * 		attributes on the resulting LI DOM node (merged with the node's 
	 * 		own data)
	 * * `a_attr` an object of values which will be used to add HTML attributes 
	 * 		on the resulting A DOM node (merged with the node's own data)
	 *
	 * There are no predefined types
	 *
	 * @name $.jstree.defaults.multitype
	 * @plugin multitype
	 */
	$.jstree.defaults.multitype = {
		'default' : {}
	};
	$.jstree.defaults.multitype[$.jstree.root] = {};

	$.jstree.plugins.multitype = function (options, parent) {
		this.init = function (el, options) {
			var i, j;
			if(options && options.multitype && options.multitype['default']) {
				for(i in options.types) {
					if(i !== "default" && i !== $.jstree.root && options.multitype.hasOwnProperty(i)) {
						for(j in options.multitype['default']) {
							if(options.multitype['default'].hasOwnProperty(j) && options.multitype[i][j] === undefined) {
								options.multitype[i][j] = options.multitype['default'][j];
							}
						}
					}
				}
			}
			parent.init.call(this, el, options);
			this._model.data[$.jstree.root].multitype = $.jstree.root;
		};
		this.refresh = function (skip_loading, forget_state) {
			parent.refresh.call(this, skip_loading, forget_state);
			this._model.data[$.jstree.root].multitype = $.jstree.root;
		};
		this.bind = function () {
			this.element
				.on('model.jstree', $.proxy(function (e, data) {
						var m = this._model.data,
							dpc = data.nodes,
							t = this.settings.multitype,
							i, j, c = 'default', k;
						for(i = 0, j = dpc.length; i < j; i++) {
							c = 'default';
							if(m[dpc[i]].original && m[dpc[i]].original.multitype && t[m[dpc[i]].original.multitype]) {
								c = m[dpc[i]].original.multitype;
							}
							if(m[dpc[i]].data && m[dpc[i]].data.jstree && m[dpc[i]].data.jstree.multitype && t[m[dpc[i]].data.jstree.multitype]) {
								c = m[dpc[i]].data.jstree.multitype;
							}
							m[dpc[i]].multitype = c;
							if(m[dpc[i]].icon === true && t[c].icon !== undefined) {
								m[dpc[i]].icon = t[c].icon;
							}
							if(t[c].li_attr !== undefined && typeof t[c].li_attr === 'object') {
								for (k in t[c].li_attr) {
									if (t[c].li_attr.hasOwnProperty(k)) {
										if (k === 'id') {
											continue;
										}
										else if (m[dpc[i]].li_attr[k] === undefined) {
											m[dpc[i]].li_attr[k] = t[c].li_attr[k];
										}
										else if (k === 'class') {
											m[dpc[i]].li_attr['class'] = t[c].li_attr['class'] + ' ' + m[dpc[i]].li_attr['class'];
										}
									}
								}
							}
							if(t[c].a_attr !== undefined && typeof t[c].a_attr === 'object') {
								for (k in t[c].a_attr) {
									if (t[c].a_attr.hasOwnProperty(k)) {
										if (k === 'id') {
											continue;
										}
										else if (m[dpc[i]].a_attr[k] === undefined) {
											m[dpc[i]].a_attr[k] = t[c].a_attr[k];
										}
										else if (k === 'href' && m[dpc[i]].a_attr[k] === '#') {
											m[dpc[i]].a_attr['href'] = t[c].a_attr['href'];
										}
										else if (k === 'class') {
											m[dpc[i]].a_attr['class'] = t[c].a_attr['class'] + ' ' + m[dpc[i]].a_attr['class'];
										}
									}
								}
							}
						}
						m[$.jstree.root].multitype = $.jstree.root;
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
		this.check = function (chk, obj, par, pos, more) {
			if(parent.check.call(this, chk, obj, par, pos, more) === false) { return false; }
			obj = obj && obj.id ? obj : this.get_node(obj);
			par = par && par.id ? par : this.get_node(par);
			var m = obj && obj.id ? (more && more.origin ? more.origin : $.jstree.reference(obj.id)) : null, tmp, d, i, j;
			m = m && m._model && m._model.data ? m._model.data : null;
			switch(chk) {
				case "create_node":
				case "move_node":
				case "copy_node":
					if(chk !== 'move_node' || $.inArray(obj.id, par.children) === -1) {
						tmp = this.get_rules(par);
						if(tmp.max_children !== undefined && tmp.max_children !== -1 && tmp.max_children === par.children.length) {
							this._data.core.last_error = { 'error' : 'check', 'plugin' : 'multitype', 'id' : 'types_01', 'reason' : 'max_children prevents function: ' + chk, 'data' : JSON.stringify({ 'chk' : chk, 'pos' : pos, 'obj' : obj && obj.id ? obj.id : false, 'par' : par && par.id ? par.id : false }) };
							return false;
						}
						if(tmp.valid_children !== undefined && tmp.valid_children !== -1 && $.inArray((obj.multitype || 'default'), tmp.valid_children) === -1) {
							this._data.core.last_error = { 'error' : 'check', 'plugin' : 'multitype', 'id' : 'types_02', 'reason' : 'valid_children prevents function: ' + chk, 'data' : JSON.stringify({ 'chk' : chk, 'pos' : pos, 'obj' : obj && obj.id ? obj.id : false, 'par' : par && par.id ? par.id : false }) };
							return false;
						}
						if(m && obj.children_d && obj.parents) {
							d = 0;
							for(i = 0, j = obj.children_d.length; i < j; i++) {
								d = Math.max(d, m[obj.children_d[i]].parents.length);
							}
							d = d - obj.parents.length + 1;
						}
						if(d <= 0 || d === undefined) { d = 1; }
						do {
							if(tmp.max_depth !== undefined && tmp.max_depth !== -1 && tmp.max_depth < d) {
								this._data.core.last_error = { 'error' : 'check', 'plugin' : 'multitype', 'id' : 'types_03', 'reason' : 'max_depth prevents function: ' + chk, 'data' : JSON.stringify({ 'chk' : chk, 'pos' : pos, 'obj' : obj && obj.id ? obj.id : false, 'par' : par && par.id ? par.id : false }) };
								return false;
							}
							par = this.get_node(par.parent);
							tmp = this.get_rules(par);
							d++;
						} while(par);
					}
					break;
			}
			return true;
		};
		/**
		 * used to retrieve the multitype settings object for a node
		 * @name get_rules(obj)
		 * @param {mixed} obj the node to find the rules for
		 * @return {Object}
		 * @plugin multitype
		 */
		this.get_rules = function (obj) {
			obj = this.get_node(obj);
			if(!obj) { return false; }
			var tmp = this.get_multitype(obj, true);
			if(tmp.max_depth === undefined) { tmp.max_depth = -1; }
			if(tmp.max_children === undefined) { tmp.max_children = -1; }
			if(tmp.valid_children === undefined) { tmp.valid_children = -1; }
			return tmp;
		};
		/**
		 * used to retrieve the multitype string or settings object for a node
		 * @name get_multitype(obj [, rules])
		 * @param {mixed} obj the node to find the rules for
		 * @param {Boolean} rules if set to `true` instead of a string the settings object will be returned
		 * @return {String|Object}
		 * @plugin multitype
		 */
		this.get_multitype = function (obj, rules) {
			obj = this.get_node(obj);
			return (!obj) ? false : ( rules ? $.extend({ 'multitype' : obj.multitype }, this.settings.multitype[obj.multitype]) : obj.multitype);
		};
		/**
		 * used to change a node's multitype
		 * @name set_multitype(obj, multitype)
		 * @param {mixed} obj the node to change
		 * @param {String} multitype the new multitype
		 * @plugin multitype
		 */
		this.set_multitype = function (obj, multitype) {
			var m = this._model.data, t, t1, t2, old_multitype, old_icon, k, d, a;
			if($.isArray(obj)) {
				obj = obj.slice();
				for(t1 = 0, t2 = obj.length; t1 < t2; t1++) {
					this.set_multitype(obj[t1], multitype);
				}
				return true;
			}
			t = this.settings.multitype;
			obj = this.get_node(obj);
			if(!t[multitype] || !obj) { return false; }
			d = this.get_node(obj, true);
			if (d && d.length) {
				a = d.children('.jstree-anchor');
			}
			old_multitype = obj.multitype;
			old_icon = this.get_icon(obj);
			obj.multitype = multitype;
			if(old_icon === true || !t[old_multitype] || (t[old_multitype].icon !== undefined && old_icon === t[old_multitype].icon)) {
				this.set_icon(obj, t[multitype].icon !== undefined ? t[multitype].icon : true);
			}

			// remove old multitype props
			if(t[old_multitype] && t[old_multitype].li_attr !== undefined && typeof t[old_multitype].li_attr === 'object') {
				for (k in t[old_multitype].li_attr) {
					if (t[old_multitype].li_attr.hasOwnProperty(k)) {
						if (k === 'id') {
							continue;
						}
						else if (k === 'class') {
							m[obj.id].li_attr['class'] = (m[obj.id].li_attr['class'] || '').replace(t[old_multitype].li_attr[k], '');
							if (d) { d.removeClass(t[old_multitype].li_attr[k]); }
						}
						else if (m[obj.id].li_attr[k] === t[old_multitype].li_attr[k]) {
							m[obj.id].li_attr[k] = null;
							if (d) { d.removeAttr(k); }
						}
					}
				}
			}
			if(t[old_multitype] && t[old_multitype].a_attr !== undefined && typeof t[old_multitype].a_attr === 'object') {
				for (k in t[old_multitype].a_attr) {
					if (t[old_multitype].a_attr.hasOwnProperty(k)) {
						if (k === 'id') {
							continue;
						}
						else if (k === 'class') {
							m[obj.id].a_attr['class'] = (m[obj.id].a_attr['class'] || '').replace(t[old_multitype].a_attr[k], '');
							if (a) { a.removeClass(t[old_multitype].a_attr[k]); }
						}
						else if (m[obj.id].a_attr[k] === t[old_multitype].a_attr[k]) {
							if (k === 'href') {
								m[obj.id].a_attr[k] = '#';
								if (a) { a.attr('href', '#'); }
							}
							else {
								delete m[obj.id].a_attr[k];
								if (a) { a.removeAttr(k); }
							}
						}
					}
				}
			}

			// add new props
			if(t[multitype].li_attr !== undefined && typeof t[multitype].li_attr === 'object') {
				for (k in t[multitype].li_attr) {
					if (t[multitype].li_attr.hasOwnProperty(k)) {
						if (k === 'id') {
							continue;
						}
						else if (m[obj.id].li_attr[k] === undefined) {
							m[obj.id].li_attr[k] = t[multitype].li_attr[k];
							if (d) {
								if (k === 'class') {
									d.addClass(t[multitype].li_attr[k]);
								}
								else {
									d.attr(k, t[multitype].li_attr[k]);
								}
							}
						}
						else if (k === 'class') {
							m[obj.id].li_attr['class'] = t[multitype].li_attr[k] + ' ' + m[obj.id].li_attr['class'];
							if (d) { d.addClass(t[multitype].li_attr[k]); }
						}
					}
				}
			}
			if(t[multitype].a_attr !== undefined && typeof t[multitype].a_attr === 'object') {
				for (k in t[multitype].a_attr) {
					if (t[multitype].a_attr.hasOwnProperty(k)) {
						if (k === 'id') {
							continue;
						}
						else if (m[obj.id].a_attr[k] === undefined) {
							m[obj.id].a_attr[k] = t[multitype].a_attr[k];
							if (a) {
								if (k === 'class') {
									a.addClass(t[multitype].a_attr[k]);
								}
								else {
									a.attr(k, t[multitype].a_attr[k]);
								}
							}
						}
						else if (k === 'href' && m[obj.id].a_attr[k] === '#') {
							m[obj.id].a_attr['href'] = t[multitype].a_attr['href'];
							if (a) { a.attr('href', t[multitype].a_attr['href']); }
						}
						else if (k === 'class') {
							m[obj.id].a_attr['class'] = t[multitype].a_attr['class'] + ' ' + m[obj.id].a_attr['class'];
							if (a) { a.addClass(t[multitype].a_attr[k]); }
						}
					}
				}
			}

			return true;
		};
	};
}));
// vi: set ts=2 sw=2: //
