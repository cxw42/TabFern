/**
 * ### Flavors plugin
 *
 * Makes it possible to add any number of "flavors" for a node.  You can then
 * control attributes of the nodes using a callback that determines those
 * attributes based on the flavors.
 *
 * Modified from the Types plugin, jstree/src/jstree.types.js.
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

	if($.jstree.plugins.flavors) { return; }

	/**
	 * An object storing settings for the plugin:
	 *
	 * * `callback` A function called as `callback(flavors, element)`.
	 *              The flavors are an array, and `element` is the DOM element
	 *              (in case you need it).  Within the callback,
	 *              `this` is the node.
	 *              The callback should return an object of own properties
	 *              to apply to the node's `<li>`.
	 *              These are provided to $().attr(), except for "class", which
	 *              is provided to $().addClass().
	 *
	 * Flavors are stored in an array, and are not interpreted by the plugin.
	 * Flavors can be anything truthy.
	 * @name $.jstree.defaults.flavors
	 * @plugin flavors
	 */
	$.jstree.defaults.flavors = {
		'callback' : false
	};

	$.jstree.plugins.flavors = function (options, parent) {
//		this.init = function (el, options) {
//			var i, j;
//			if(options && options.flavors && options.flavors['default']) {
//				for(i in options.flavors) {
//					if(i !== "default" && i !== $.jstree.root && options.flavors.hasOwnProperty(i)) {
//						for(j in options.flavors['default']) {
//							if(options.flavors['default'].hasOwnProperty(j) && options.flavors[i][j] === undefined) {
//								options.flavors[i][j] = options.flavors['default'][j];
//							}
//						}
//					}
//				}
//			}
//			parent.init.call(this, el, options);
//			this._model.data[$.jstree.root].type = $.jstree.root;
//		};

//		this.refresh = function (skip_loading, forget_state) {
//			parent.refresh.call(this, skip_loading, forget_state);
//			this._model.data[$.jstree.root].type = $.jstree.root;
//		};

//		this.bind = function () {
//			this.element
//				.on('model.jstree', $.proxy(function (e, data) {
//						var m = this._model.data,
//							dpc = data.nodes,
//							t = this.settings.flavors,
//							i, j, c = 'default', k;
//						for(i = 0, j = dpc.length; i < j; i++) {
//							c = 'default';
//							if(m[dpc[i]].original && m[dpc[i]].original.type && t[m[dpc[i]].original.type]) {
//								c = m[dpc[i]].original.type;
//							}
//							if(m[dpc[i]].data && m[dpc[i]].data.jstree && m[dpc[i]].data.jstree.type && t[m[dpc[i]].data.jstree.type]) {
//								c = m[dpc[i]].data.jstree.type;
//							}
//							m[dpc[i]].type = c;
//							if(m[dpc[i]].icon === true && t[c].icon !== undefined) {
//								m[dpc[i]].icon = t[c].icon;
//							}
//							if(t[c].li_attr !== undefined && typeof t[c].li_attr === 'object') {
//								for (k in t[c].li_attr) {
//									if (t[c].li_attr.hasOwnProperty(k)) {
//										if (k === 'id') {
//											continue;
//										}
//										else if (m[dpc[i]].li_attr[k] === undefined) {
//											m[dpc[i]].li_attr[k] = t[c].li_attr[k];
//										}
//										else if (k === 'class') {
//											m[dpc[i]].li_attr['class'] = t[c].li_attr['class'] + ' ' + m[dpc[i]].li_attr['class'];
//										}
//									}
//								}
//							}
//							if(t[c].a_attr !== undefined && typeof t[c].a_attr === 'object') {
//								for (k in t[c].a_attr) {
//									if (t[c].a_attr.hasOwnProperty(k)) {
//										if (k === 'id') {
//											continue;
//										}
//										else if (m[dpc[i]].a_attr[k] === undefined) {
//											m[dpc[i]].a_attr[k] = t[c].a_attr[k];
//										}
//										else if (k === 'href' && m[dpc[i]].a_attr[k] === '#') {
//											m[dpc[i]].a_attr['href'] = t[c].a_attr['href'];
//										}
//										else if (k === 'class') {
//											m[dpc[i]].a_attr['class'] = t[c].a_attr['class'] + ' ' + m[dpc[i]].a_attr['class'];
//										}
//									}
//								}
//							}
//						}
//						m[$.jstree.root].type = $.jstree.root;
//					}, this));
//			parent.bind.call(this);
//		}; //bind()

//		this.get_json = function (obj, options, flat) {
//			var i, j,
//				m = this._model.data,
//				opt = options ? $.extend(true, {}, options, {no_id:false}) : {},
//				tmp = parent.get_json.call(this, obj, opt, flat);
//			if(tmp === false) { return false; }
//			if($.isArray(tmp)) {
//				for(i = 0, j = tmp.length; i < j; i++) {
//					tmp[i].type = tmp[i].id && m[tmp[i].id] && m[tmp[i].id].type ? m[tmp[i].id].type : "default";
//					if(options && options.no_id) {
//						delete tmp[i].id;
//						if(tmp[i].li_attr && tmp[i].li_attr.id) {
//							delete tmp[i].li_attr.id;
//						}
//						if(tmp[i].a_attr && tmp[i].a_attr.id) {
//							delete tmp[i].a_attr.id;
//						}
//					}
//				}
//			}
//			else {
//				tmp.type = tmp.id && m[tmp.id] && m[tmp.id].type ? m[tmp.id].type : "default";
//				if(options && options.no_id) {
//					tmp = this._delete_ids(tmp);
//				}
//			}
//			return tmp;
//		}; //get_json()

//		this.create_node = function (par, node, pos, callback, is_loaded) {
//			var node = parent.create_node.call(this, par, node, pos, callback, is_loaded);
//			node.flavor = [];
//			return node;
//		}; //create_node

		/**
		 * Check if a node has a flavor.  Returns false on invalid inputs.
		 */
		this.has_flavor = function(obj, flavor) {
			obj = this.get_node(obj);
			if(!obj || !flavor) { return false; }
			obj.flavor = obj.flavor || [];
			return (obj.flavor.indexOf(flavor) !== -1);
		}; //has_flavor

		/**
		 * Add a flavor to a node.
		 * @param obj {mixed} The object
		 * @param flavor {mixed} The flavor or array of flavors
		 */
		this.add_flavor = function(obj, flavor) {
			obj = this.get_node(obj);
			if(!obj || !flavor) { return false; }
			obj.flavor = obj.flavor || [];
			if(!Array.isArray(flavor)) flavor = [flavor];

			for(var idx in flavor) {
				obj.flavor.push(flavor[idx]);
			}

			this._node_changed(obj);
			this.redraw();
		}; //add_flavor

		/**
		 * Remove a flavor from a node.
		 * @param obj {mixed} The object
		 * @param flavor {mixed} The flavor or array of flavors
		 */
		this.remove_flavor = function(obj, flavor) {
			obj = this.get_node(obj);
			if(!obj || !flavor) { return false; }
			obj.flavor = obj.flavor || [];
			if(!Array.isArray(flavor)) flavor = [flavor];

			var did_change = false;
			for(var idx in flavor) {
				var pos = obj.flavor.indexOf(flavor[idx]);
				if(pos !== -1) {
					obj.flavor.splice(pos,1);	// remove that flavor
					did_change = true;
				} //endif we are removing it
			} //foreach flavor

			if(did_change) {
				this._node_changed(obj);
				this.redraw();
			}
		}; //remove_flavor

		/**
		 * Clear all flavors from a node
		 */
		this.clear_flavors = function(obj) {
			obj = this.get_node(obj);
			if(!obj) { return false; }
			obj.flavor = [];
			this._node_changed(obj);
			this.redraw();
		}; //clear_flavors

		/// Redraw.
		/// @param {DOM object} obj The node being redrawn
		/// @return the object, if the parent was able to redraw it.
		this.redraw_node = function(obj, deep, callback, force_render) {
			obj = parent.redraw_node.apply(this, arguments);
			if(obj) {
				// TODO refactor so we call the callback on model.jstree
				// and add/remove/clear_flavor rather than on every draw
				CBK: if(typeof this.settings.flavors.callback === 'function') {
					var node = this.get_node(obj.id);
					if(!node) break CBK;

					var attrs = this.settings.flavors.callback.call(
							node, node.flavor || [], obj);
					if(!attrs || typeof attrs !== 'object') break CBK;

					var jq = $(obj);	// $(obj.id) might not exist yet.
					var names = Object.getOwnPropertyNames(attrs);
					for(var idx in names) {
						var k = names[idx];
						if(k === 'class') {
							jq.addClass(attrs[k]);
						} else {
							jq.attr(k, attrs[k]);
						}
					}
				} //endif we have a callback
			}
			return obj;
		}; //redraw_node

//		/**
//		 * used to retrieve the type settings object for a node
//		 * @name get_rules(obj)
//		 * @param {mixed} obj the node to find the rules for
//		 * @return {Object}
//		 * @plugin flavors
//		 */
//		this.get_rules = function (obj) {
//			obj = this.get_node(obj);
//			if(!obj) { return false; }
//			var tmp = this.get_type(obj, true);
//			if(tmp.max_depth === undefined) { tmp.max_depth = -1; }
//			if(tmp.max_children === undefined) { tmp.max_children = -1; }
//			if(tmp.valid_children === undefined) { tmp.valid_children = -1; }
//			return tmp;
//		};
//		/**
//		 * used to retrieve the type string or settings object for a node
//		 * @name get_type(obj [, rules])
//		 * @param {mixed} obj the node to find the rules for
//		 * @param {Boolean} rules if set to `true` instead of a string the settings object will be returned
//		 * @return {String|Object}
//		 * @plugin flavors
//		 */
//		this.get_type = function (obj, rules) {
//			obj = this.get_node(obj);
//			return (!obj) ? false : ( rules ? $.extend({ 'type' : obj.type }, this.settings.flavors[obj.type]) : obj.type);
//		};
//		/**
//		 * used to change a node's type
//		 * @name set_type(obj, type)
//		 * @param {mixed} obj the node to change
//		 * @param {String} type the new type
//		 * @plugin flavors
//		 */
//		this.set_type = function (obj, type) {
//			var m = this._model.data, t, t1, t2, old_type, old_icon, k, d, a;
//			if($.isArray(obj)) {
//				obj = obj.slice();
//				for(t1 = 0, t2 = obj.length; t1 < t2; t1++) {
//					this.set_type(obj[t1], type);
//				}
//				return true;
//			}
//			t = this.settings.flavors;
//			obj = this.get_node(obj);
//			if(!t[type] || !obj) { return false; }
//			d = this.get_node(obj, true);
//			if (d && d.length) {
//				a = d.children('.jstree-anchor');
//			}
//			old_type = obj.type;
//			old_icon = this.get_icon(obj);
//			obj.type = type;
//			if(old_icon === true || !t[old_type] || (t[old_type].icon !== undefined && old_icon === t[old_type].icon)) {
//				this.set_icon(obj, t[type].icon !== undefined ? t[type].icon : true);
//			}
//
//			// remove old type props
//			if(t[old_type] && t[old_type].li_attr !== undefined && typeof t[old_type].li_attr === 'object') {
//				for (k in t[old_type].li_attr) {
//					if (t[old_type].li_attr.hasOwnProperty(k)) {
//						if (k === 'id') {
//							continue;
//						}
//						else if (k === 'class') {
//							m[obj.id].li_attr['class'] = (m[obj.id].li_attr['class'] || '').replace(t[old_type].li_attr[k], '');
//							if (d) { d.removeClass(t[old_type].li_attr[k]); }
//						}
//						else if (m[obj.id].li_attr[k] === t[old_type].li_attr[k]) {
//							m[obj.id].li_attr[k] = null;
//							if (d) { d.removeAttr(k); }
//						}
//					}
//				}
//			}
//			if(t[old_type] && t[old_type].a_attr !== undefined && typeof t[old_type].a_attr === 'object') {
//				for (k in t[old_type].a_attr) {
//					if (t[old_type].a_attr.hasOwnProperty(k)) {
//						if (k === 'id') {
//							continue;
//						}
//						else if (k === 'class') {
//							m[obj.id].a_attr['class'] = (m[obj.id].a_attr['class'] || '').replace(t[old_type].a_attr[k], '');
//							if (a) { a.removeClass(t[old_type].a_attr[k]); }
//						}
//						else if (m[obj.id].a_attr[k] === t[old_type].a_attr[k]) {
//							if (k === 'href') {
//								m[obj.id].a_attr[k] = '#';
//								if (a) { a.attr('href', '#'); }
//							}
//							else {
//								delete m[obj.id].a_attr[k];
//								if (a) { a.removeAttr(k); }
//							}
//						}
//					}
//				}
//			}
//
//			// add new props
//			if(t[type].li_attr !== undefined && typeof t[type].li_attr === 'object') {
//				for (k in t[type].li_attr) {
//					if (t[type].li_attr.hasOwnProperty(k)) {
//						if (k === 'id') {
//							continue;
//						}
//						else if (m[obj.id].li_attr[k] === undefined) {
//							m[obj.id].li_attr[k] = t[type].li_attr[k];
//							if (d) {
//								if (k === 'class') {
//									d.addClass(t[type].li_attr[k]);
//								}
//								else {
//									d.attr(k, t[type].li_attr[k]);
//								}
//							}
//						}
//						else if (k === 'class') {
//							m[obj.id].li_attr['class'] = t[type].li_attr[k] + ' ' + m[obj.id].li_attr['class'];
//							if (d) { d.addClass(t[type].li_attr[k]); }
//						}
//					}
//				}
//			}
//			if(t[type].a_attr !== undefined && typeof t[type].a_attr === 'object') {
//				for (k in t[type].a_attr) {
//					if (t[type].a_attr.hasOwnProperty(k)) {
//						if (k === 'id') {
//							continue;
//						}
//						else if (m[obj.id].a_attr[k] === undefined) {
//							m[obj.id].a_attr[k] = t[type].a_attr[k];
//							if (a) {
//								if (k === 'class') {
//									a.addClass(t[type].a_attr[k]);
//								}
//								else {
//									a.attr(k, t[type].a_attr[k]);
//								}
//							}
//						}
//						else if (k === 'href' && m[obj.id].a_attr[k] === '#') {
//							m[obj.id].a_attr['href'] = t[type].a_attr['href'];
//							if (a) { a.attr('href', t[type].a_attr['href']); }
//						}
//						else if (k === 'class') {
//							m[obj.id].a_attr['class'] = t[type].a_attr['class'] + ' ' + m[obj.id].a_attr['class'];
//							if (a) { a.addClass(t[type].a_attr[k]); }
//						}
//					}
//				}
//			}
//
//			return true;
//		};

	};

}));
// vi: set ts=4 sw=4 noet ai fo-=ro: //
