(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function compute_slots(slots) {
        const result = {};
        for (const key in slots) {
            result[key] = true;
        }
        return result;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src/SidebarPanels.svelte generated by Svelte v3.38.3 */

    const { window: window_1 } = globals;
    const get_right_slot_changes = dirty => ({});
    const get_right_slot_context = ctx => ({});
    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});
    const get_left_slot_changes = dirty => ({});
    const get_left_slot_context = ctx => ({});

    // (148:1) {#if $$slots.left}
    function create_if_block_3(ctx) {
    	let div;
    	let current;
    	const left_slot_template = /*#slots*/ ctx[30].left;
    	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[29], get_left_slot_context);

    	return {
    		c() {
    			div = element("div");
    			if (left_slot) left_slot.c();
    			attr(div, "style", /*leftMenuStyle*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (left_slot) {
    				left_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (left_slot) {
    				if (left_slot.p && (!current || dirty[0] & /*$$scope*/ 536870912)) {
    					update_slot(left_slot, left_slot_template, ctx, /*$$scope*/ ctx[29], !current ? [-1, -1] : dirty, get_left_slot_changes, get_left_slot_context);
    				}
    			}

    			if (!current || dirty[0] & /*leftMenuStyle*/ 2) {
    				attr(div, "style", /*leftMenuStyle*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(left_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(left_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (left_slot) left_slot.d(detaching);
    		}
    	};
    }

    // (158:1) {#if $$slots.right}
    function create_if_block_2(ctx) {
    	let div;
    	let current;
    	const right_slot_template = /*#slots*/ ctx[30].right;
    	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[29], get_right_slot_context);

    	return {
    		c() {
    			div = element("div");
    			if (right_slot) right_slot.c();
    			attr(div, "style", /*rightMenuStyle*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (right_slot) {
    				right_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (right_slot) {
    				if (right_slot.p && (!current || dirty[0] & /*$$scope*/ 536870912)) {
    					update_slot(right_slot, right_slot_template, ctx, /*$$scope*/ ctx[29], !current ? [-1, -1] : dirty, get_right_slot_changes, get_right_slot_context);
    				}
    			}

    			if (!current || dirty[0] & /*rightMenuStyle*/ 4) {
    				attr(div, "style", /*rightMenuStyle*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(right_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(right_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (right_slot) right_slot.d(detaching);
    		}
    	};
    }

    // (164:1) {#if $$slots.left && mobileMode}
    function create_if_block_1(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "style", /*leftScrimStyle*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = listen(div, "click", /*leftScrimOff*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*leftScrimStyle*/ 8) {
    				attr(div, "style", /*leftScrimStyle*/ ctx[3]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (168:1) {#if $$slots.right && mobileMode}
    function create_if_block(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "style", /*rightScrimStyle*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = listen(div, "click", /*rightScrimOff*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*rightScrimStyle*/ 16) {
    				attr(div, "style", /*rightScrimStyle*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$$slots*/ ctx[10].left && create_if_block_3(ctx);
    	const content_slot_template = /*#slots*/ ctx[30].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[29], get_content_slot_context);
    	let if_block1 = /*$$slots*/ ctx[10].right && create_if_block_2(ctx);
    	let if_block2 = /*$$slots*/ ctx[10].left && /*mobileMode*/ ctx[0] && create_if_block_1(ctx);
    	let if_block3 = /*$$slots*/ ctx[10].right && /*mobileMode*/ ctx[0] && create_if_block(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			if (content_slot) content_slot.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			if (if_block3) if_block3.c();
    			attr(div0, "style", /*contentStyle*/ ctx[5]);
    			set_style(div1, "position", "absolute");
    			set_style(div1, "top", "0");
    			set_style(div1, "bottom", "0");
    			set_style(div1, "left", "0");
    			set_style(div1, "right", "0");
    			set_style(div1, "overflow-x", "hidden");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);

    			if (content_slot) {
    				content_slot.m(div0, null);
    			}

    			append(div1, t1);
    			if (if_block1) if_block1.m(div1, null);
    			append(div1, t2);
    			if (if_block2) if_block2.m(div1, null);
    			append(div1, t3);
    			if (if_block3) if_block3.m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(window_1, "resize", /*setPanelStates*/ ctx[7](true)),
    					listen(div0, "transitionend", /*onTransitionEnd*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*$$slots*/ ctx[10].left) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*$$slots*/ 1024) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (content_slot) {
    				if (content_slot.p && (!current || dirty[0] & /*$$scope*/ 536870912)) {
    					update_slot(content_slot, content_slot_template, ctx, /*$$scope*/ ctx[29], !current ? [-1, -1] : dirty, get_content_slot_changes, get_content_slot_context);
    				}
    			}

    			if (!current || dirty[0] & /*contentStyle*/ 32) {
    				attr(div0, "style", /*contentStyle*/ ctx[5]);
    			}

    			if (/*$$slots*/ ctx[10].right) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$$slots*/ 1024) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, t2);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*$$slots*/ ctx[10].left && /*mobileMode*/ ctx[0]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div1, t3);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*$$slots*/ ctx[10].right && /*mobileMode*/ ctx[0]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(div1, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(content_slot, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(content_slot, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			if (content_slot) content_slot.d(detaching);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let mobileMode;
    	let mobilePanelWidth;
    	let leftMenuStyle;
    	let rightMenuStyle;
    	let leftScrimStyle;
    	let rightScrimStyle;
    	let contentLeft;
    	let contentWidth;
    	let contentStyle;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	const dispatch = createEventDispatcher();

    	const updatePanels = ({ left, right }) => {
    		if (left !== undefined) {
    			setLeft(!!left);
    		}

    		if (right !== undefined) {
    			setRight(!!right);
    		}
    	};

    	let { mobileBreakpoint = 500 } = $$props;
    	let { scrimWidth = "70px" } = $$props;
    	let { scrimColor = "#444" } = $$props;
    	let { leftOpenBreakpoint = 768 } = $$props;
    	let { rightOpenBreakpoint = 1200 } = $$props;
    	let { width = "250px" } = $$props;
    	let { leftWidth } = $$props;
    	let { rightWidth } = $$props;
    	let { duration = "0.08s" } = $$props;

    	// =============== end of exports ===============
    	let windowWidth;

    	let leftOpen;
    	let leftTransitioning;
    	let rightOpen;
    	let rightTransitioning;

    	const setLeft = (open, transition = true) => {
    		$$invalidate(22, leftOpen = open);
    		$$invalidate(23, leftTransitioning = transition);
    	};

    	const setRight = (open, transition = true) => {
    		$$invalidate(24, rightOpen = open);
    		$$invalidate(25, rightTransitioning = transition);
    	};

    	const onTransitionEnd = ({ propertyName }) => {
    		if (propertyName === "left" || propertyName === "width") {
    			$$invalidate(23, leftTransitioning = false);
    			$$invalidate(25, rightTransitioning = false);
    			dispatch("change", { left: leftOpen, right: rightOpen });
    		}
    	};

    	const setPanelStates = transition => () => {
    		$$invalidate(21, windowWidth = window.innerWidth);

    		if (leftOpenBreakpoint && windowWidth > leftOpenBreakpoint) {
    			setLeft(true, transition);
    		}

    		if (rightOpenBreakpoint && windowWidth > rightOpenBreakpoint) {
    			setRight(true, transition);
    		}

    		if (leftOpenBreakpoint && windowWidth < leftOpenBreakpoint) {
    			setLeft(false, transition);
    		}

    		if (rightOpenBreakpoint && windowWidth < rightOpenBreakpoint) {
    			setRight(false, transition);
    		}

    		dispatch("change", { left: leftOpen, right: rightOpen });
    	};

    	onMount(setPanelStates(false));

    	const leftScrimOff = () => {
    		setLeft(false);
    	};

    	const rightScrimOff = () => {
    		setRight(false);
    	};

    	const commonStyles = `
		position: absolute;
		top: 0;
		bottom: 0;
		overflow-y: scroll;
	`;

    	const makeMenuStyle = (side, width, z) => `
		${commonStyles}
		${side}: 0;
		width: ${width};
		z-index: ${z};
	`;

    	const makeScrimStyle = (side, open, transitioning, color) => `
		${commonStyles}
		${side}: calc(100% - ${scrimWidth});
		width: ${scrimWidth};
		z-index: ${open && !transitioning ? "5" : "-1"};
		opacity: ${open && !transitioning && "0.5" || "0"};
		background-color: ${color};
	`;

    	$$self.$$set = $$props => {
    		if ("mobileBreakpoint" in $$props) $$invalidate(12, mobileBreakpoint = $$props.mobileBreakpoint);
    		if ("scrimWidth" in $$props) $$invalidate(13, scrimWidth = $$props.scrimWidth);
    		if ("scrimColor" in $$props) $$invalidate(14, scrimColor = $$props.scrimColor);
    		if ("leftOpenBreakpoint" in $$props) $$invalidate(15, leftOpenBreakpoint = $$props.leftOpenBreakpoint);
    		if ("rightOpenBreakpoint" in $$props) $$invalidate(16, rightOpenBreakpoint = $$props.rightOpenBreakpoint);
    		if ("width" in $$props) $$invalidate(17, width = $$props.width);
    		if ("leftWidth" in $$props) $$invalidate(18, leftWidth = $$props.leftWidth);
    		if ("rightWidth" in $$props) $$invalidate(19, rightWidth = $$props.rightWidth);
    		if ("duration" in $$props) $$invalidate(20, duration = $$props.duration);
    		if ("$$scope" in $$props) $$invalidate(29, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*windowWidth, mobileBreakpoint*/ 2101248) {
    			$$invalidate(0, mobileMode = windowWidth < mobileBreakpoint);
    		}

    		if ($$self.$$.dirty[0] & /*scrimWidth*/ 8192) {
    			$$invalidate(26, mobilePanelWidth = `calc(100% - ${scrimWidth})`);
    		}

    		if ($$self.$$.dirty[0] & /*mobileMode, mobilePanelWidth, leftWidth, width, leftOpen*/ 71696385) {
    			$$invalidate(1, leftMenuStyle = makeMenuStyle("left", mobileMode ? mobilePanelWidth : leftWidth || width, mobileMode && leftOpen ? "3" : "2"));
    		}

    		if ($$self.$$.dirty[0] & /*mobileMode, mobilePanelWidth, rightWidth, width, rightOpen*/ 84541441) {
    			$$invalidate(2, rightMenuStyle = makeMenuStyle("right", mobileMode ? mobilePanelWidth : rightWidth || width, mobileMode && rightOpen ? "2" : "1"));
    		}

    		if ($$self.$$.dirty[0] & /*mobileMode, leftOpen, leftTransitioning, scrimColor*/ 12599297) {
    			$$invalidate(3, leftScrimStyle = mobileMode && makeScrimStyle("left", leftOpen, leftTransitioning, scrimColor));
    		}

    		if ($$self.$$.dirty[0] & /*mobileMode, rightOpen, rightTransitioning, scrimColor*/ 50348033) {
    			$$invalidate(4, rightScrimStyle = mobileMode && makeScrimStyle("right", rightOpen, rightTransitioning, scrimColor));
    		}

    		if ($$self.$$.dirty[0] & /*mobileMode, leftOpen, scrimWidth, rightOpen, leftWidth, width*/ 21372929) {
    			$$invalidate(27, contentLeft = mobileMode
    			? leftOpen && `calc(100% - ${scrimWidth})` || rightOpen && `calc(${scrimWidth} - 100%)` || "0px"
    			: leftOpen ? leftWidth || width : "0px");
    		}

    		if ($$self.$$.dirty[0] & /*mobileMode, leftOpen, leftWidth, width, rightOpen, rightWidth*/ 21889025) {
    			$$invalidate(28, contentWidth = mobileMode
    			? "100%"
    			: `calc(100% - ${leftOpen ? leftWidth || width : "0px"} - ${rightOpen ? rightWidth || width : "0px"})`);
    		}

    		if ($$self.$$.dirty[0] & /*contentLeft, contentWidth, duration*/ 403701760) {
    			$$invalidate(5, contentStyle = `
		${commonStyles}
		left: ${contentLeft};
		width: ${contentWidth};
		transition: width ${duration} ease-in-out, left ${duration} ease-in-out;
		z-index: 5;
	`);
    		}
    	};

    	return [
    		mobileMode,
    		leftMenuStyle,
    		rightMenuStyle,
    		leftScrimStyle,
    		rightScrimStyle,
    		contentStyle,
    		onTransitionEnd,
    		setPanelStates,
    		leftScrimOff,
    		rightScrimOff,
    		$$slots,
    		updatePanels,
    		mobileBreakpoint,
    		scrimWidth,
    		scrimColor,
    		leftOpenBreakpoint,
    		rightOpenBreakpoint,
    		width,
    		leftWidth,
    		rightWidth,
    		duration,
    		windowWidth,
    		leftOpen,
    		leftTransitioning,
    		rightOpen,
    		rightTransitioning,
    		mobilePanelWidth,
    		contentLeft,
    		contentWidth,
    		$$scope,
    		slots
    	];
    }

    class SidebarPanels extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				updatePanels: 11,
    				mobileBreakpoint: 12,
    				scrimWidth: 13,
    				scrimColor: 14,
    				leftOpenBreakpoint: 15,
    				rightOpenBreakpoint: 16,
    				width: 17,
    				leftWidth: 18,
    				rightWidth: 19,
    				duration: 20
    			},
    			[-1, -1]
    		);
    	}

    	get updatePanels() {
    		return this.$$.ctx[11];
    	}
    }

    /* src/demo/LoremIpsum.svelte generated by Svelte v3.38.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (49:0) {#each lorem as ipsum}
    function create_each_block(ctx) {
    	let p;
    	let t_value = /*ipsum*/ ctx[5] + "";
    	let t;

    	return {
    		c() {
    			p = element("p");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*lorem*/ 2 && t_value !== (t_value = /*ipsum*/ ctx[5] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div7;
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let t2;
    	let div2;
    	let div1;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let each_1_anchor;
    	let mounted;
    	let dispose;
    	let each_value = /*lorem*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");

    			div0.innerHTML = `Filler
						<br/>
						Text`;

    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "+";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(div0, "class", "col-auto");
    			set_style(div0, "margin-top", "-6px");
    			attr(button0, "type", "button");
    			attr(button0, "class", "btn btn-primary");
    			attr(button1, "type", "button");
    			attr(button1, "class", "btn btn-primary");
    			attr(div1, "class", "btn-group");
    			attr(div1, "role", "group");
    			attr(div1, "aria-label", "Toggle panels");
    			attr(div2, "class", "col-auto");
    			attr(div3, "class", "row");
    			attr(div4, "class", "card-body");
    			attr(div5, "class", "card mt-3 mb-3");
    			attr(div6, "class", "col-auto");
    			attr(div7, "class", "row");
    		},
    		m(target, anchor) {
    			insert(target, div7, anchor);
    			append(div7, div6);
    			append(div6, div5);
    			append(div5, div4);
    			append(div4, div3);
    			append(div3, div0);
    			append(div3, t2);
    			append(div3, div2);
    			append(div2, div1);
    			append(div1, button0);
    			append(div1, t4);
    			append(div1, button1);
    			insert(target, t6, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[2]),
    					listen(button1, "click", /*click_handler_1*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*lorem*/ 2) {
    				each_value = /*lorem*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div7);
    			if (detaching) detach(t6);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let lorem;

    	const longTextThings = [
    		`Level the playing field turn the crank time vampire yet critical mass one-sheet we need this overall to be busier and more active are there any leftovers in the kitchen? Organic growth keep it lean, nor best practices dunder mifflin we need to crystallize a plan.`,
    		`Let's schedule a standup during the sprint to review our kpis who's responsible for the ask for this request? tbrand terrorists, for personal development 4-blocker and blue sky those options are already baked in with this model.`,
    		`Nail it down execute gain traction, we need distributors to evangelize the new line to local markets cross sabers. On this journey throughput so digitalize, nor note for the previous submit: the devil should be on the left shoulder future-proof prethink.`,
    		`Move the needle overcome key issues to meet key milestones sacred cow, for locked and loaded, but productize. High-level five-year strategic plan thinking outside the box, yet one-sheet, t-shaped individual nor move the needle, paddle on both sides.`,
    		`Per my previous email tread it daily. Parallel path synergize productive mindfulness or cannibalize let's see if we can dovetail these two projects rock Star/Ninja, and cross-pollination low-hanging fruit.`,
    		`Beef up let me know if you need me to crack any skulls and your work on this project has been really impactful, but run it up the flagpole, ping the boss and circle back. Sea change deploy where the metal hits the meat but rock Star/Ninja UI, or low engagement hard stop.`,
    		`Today shall be a cloudy day, thanks to blue sky thinking, we can now deploy our new ui to the cloud incentivization yet move the needle after I ran into Helen at a restaurant, I realized she was just office pretty, nor on this journey.`,
    		`It's a simple lift and shift job build on a culture of contribution and inclusion golden goose, run it up the flagpole, ping the boss and circle back, yet groom the backlog. Commitment to the cause do i have consent to record this meeting or bells and whistles, yet finance yet closer to the metal.`,
    		`Let's take this conversation offline come up with something buzzworthy. Note for the previous submit: the devil should be on the left shoulder great plan! let me diarize this, and we can synchronise ourselves at a later timepoint yet pass the mayo, appeal to the client, sue the vice president reach out, for viral engagement, but we can't hear you into the weeds.`,
    		`Punter nail it down, but nobody's fault it could have been managed better but can we take this offline, and move the needle open door policy please use "solutionise" instead of solution ideas! :). Back of the net baseline you must be muted for we’re starting to formalize flexible opinions around our foundations and pipeline lift and shift.`,
    		`It's not hard guys. Product management breakout fastworks product market fit yet to be inspired is to become creative, innovative and energized we want this philosophy to trickle down to all our stakeholders my grasp on reality right now is tenuous, and who's the goto on this job with the way forward.`,
    		`Value-added we need to build it so that it scales, powerPointless loop back put a record on and see who dances, for synergestic actionables conversational content . If you want to motivate these clowns, try less carrot and more stick spinning our wheels turn the crank, nor pushback, or message the initiative.`,
    		`Get six alpha pups in here for a focus group it is all exactly as i said, but i don't like it, or ultimate measure of success, but please use "solutionise" instead of solution ideas! :) Q1. Imagineer show pony re-inventing the wheel.`,
    		`Locked and loaded five-year strategic plan, pushback, so translating our vision of having a market leading platfrom note for the previous submit: the devil should be on the left shoulder but ultimate measure of success. A better understanding of usage can aid in prioritizing future efforts we need this overall to be busier and more active.`
    	];

    	let count = 1;
    	const click_handler = () => $$invalidate(0, count++, count);

    	const click_handler_1 = () => {
    		if (count) {
    			$$invalidate(0, count--, count);
    		}
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*count*/ 1) {
    			$$invalidate(1, lorem = new Array(count).fill("").map((_, index) => longTextThings[index % longTextThings.length]));
    		}
    	};

    	return [count, lorem, click_handler, click_handler_1];
    }

    class LoremIpsum extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/demo/DemoControls.svelte generated by Svelte v3.38.3 */

    function create_fragment$1(ctx) {
    	let div3;
    	let div2;
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let h40;
    	let t5;
    	let p1;
    	let t7;
    	let div0;
    	let button0;
    	let t8;
    	let button0_class_value;
    	let t9;
    	let button1;
    	let t10;
    	let button1_class_value;
    	let t11;
    	let h41;
    	let t13;
    	let p2;
    	let t15;
    	let div1;
    	let button2;
    	let t16;
    	let button2_class_value;
    	let t17;
    	let button3;
    	let t18;
    	let button3_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Controls";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Not all controls are shown or needed, this just demonstrates a few of them.";
    			t3 = space();
    			h40 = element("h4");
    			h40.textContent = "Toggle panel visibility";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Panels are automatically initialized open/closed based on the screen width,\n\t\t\tand automatically open/close if the window is resized. (You can opt out of\n\t\t\tthat behaviour.)";
    			t7 = space();
    			div0 = element("div");
    			button0 = element("button");
    			t8 = text("Toggle Left");
    			t9 = space();
    			button1 = element("button");
    			t10 = text("Toggle Right");
    			t11 = space();
    			h41 = element("h4");
    			h41.textContent = "Panel animation";
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "The animation of the panels is quick and subtle, here you\n\t\t\tcan slow it down to check for visual errors.";
    			t15 = space();
    			div1 = element("div");
    			button2 = element("button");
    			t16 = text("Normal Speed");
    			t17 = space();
    			button3 = element("button");
    			t18 = text("Slow Speed");
    			attr(button0, "type", "button");
    			attr(button0, "class", button0_class_value = "btn btn-" + (/*leftOpen*/ ctx[1] ? "primary" : "secondary"));
    			attr(button1, "type", "button");
    			attr(button1, "class", button1_class_value = "btn btn-" + (/*rightOpen*/ ctx[2] ? "primary" : "secondary"));
    			attr(div0, "class", "btn-group");
    			attr(div0, "role", "group");
    			attr(div0, "aria-label", "Toggle panels");
    			attr(h41, "class", "mt-4");
    			attr(button2, "type", "button");
    			attr(button2, "class", button2_class_value = "btn btn-" + (/*panelAnimatesSlowly*/ ctx[3] ? "secondary" : "primary"));
    			attr(button3, "type", "button");
    			attr(button3, "class", button3_class_value = "btn btn-" + (/*panelAnimatesSlowly*/ ctx[3] ? "primary" : "secondary"));
    			attr(div1, "class", "btn-group");
    			attr(div1, "role", "group");
    			attr(div1, "aria-label", "Toggle panels");
    			attr(div2, "class", "card-body");
    			attr(div3, "class", "card");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, h2);
    			append(div2, t1);
    			append(div2, p0);
    			append(div2, t3);
    			append(div2, h40);
    			append(div2, t5);
    			append(div2, p1);
    			append(div2, t7);
    			append(div2, div0);
    			append(div0, button0);
    			append(button0, t8);
    			append(div0, t9);
    			append(div0, button1);
    			append(button1, t10);
    			append(div2, t11);
    			append(div2, h41);
    			append(div2, t13);
    			append(div2, p2);
    			append(div2, t15);
    			append(div2, div1);
    			append(div1, button2);
    			append(button2, t16);
    			append(div1, t17);
    			append(div1, button3);
    			append(button3, t18);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[5]),
    					listen(button1, "click", /*click_handler_1*/ ctx[6]),
    					listen(button2, "click", /*click_handler_2*/ ctx[7]),
    					listen(button3, "click", /*click_handler_3*/ ctx[8])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*leftOpen*/ 2 && button0_class_value !== (button0_class_value = "btn btn-" + (/*leftOpen*/ ctx[1] ? "primary" : "secondary"))) {
    				attr(button0, "class", button0_class_value);
    			}

    			if (dirty & /*rightOpen*/ 4 && button1_class_value !== (button1_class_value = "btn btn-" + (/*rightOpen*/ ctx[2] ? "primary" : "secondary"))) {
    				attr(button1, "class", button1_class_value);
    			}

    			if (dirty & /*panelAnimatesSlowly*/ 8 && button2_class_value !== (button2_class_value = "btn btn-" + (/*panelAnimatesSlowly*/ ctx[3] ? "secondary" : "primary"))) {
    				attr(button2, "class", button2_class_value);
    			}

    			if (dirty & /*panelAnimatesSlowly*/ 8 && button3_class_value !== (button3_class_value = "btn btn-" + (/*panelAnimatesSlowly*/ ctx[3] ? "primary" : "secondary"))) {
    				attr(button3, "class", button3_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { leftOpen } = $$props;
    	let { rightOpen } = $$props;
    	let { duration } = $$props;
    	let panelAnimatesSlowly;
    	const click_handler = () => dispatch("toggleLeft");
    	const click_handler_1 = () => dispatch("toggleRight");

    	const click_handler_2 = () => {
    		$$invalidate(0, duration = "0.08s");
    		$$invalidate(3, panelAnimatesSlowly = false);
    	};

    	const click_handler_3 = () => {
    		$$invalidate(0, duration = "1.5s");
    		$$invalidate(3, panelAnimatesSlowly = true);
    	};

    	$$self.$$set = $$props => {
    		if ("leftOpen" in $$props) $$invalidate(1, leftOpen = $$props.leftOpen);
    		if ("rightOpen" in $$props) $$invalidate(2, rightOpen = $$props.rightOpen);
    		if ("duration" in $$props) $$invalidate(0, duration = $$props.duration);
    	};

    	return [
    		duration,
    		leftOpen,
    		rightOpen,
    		panelAnimatesSlowly,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class DemoControls extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { leftOpen: 1, rightOpen: 2, duration: 0 });
    	}
    }

    /* src/demo/Demo.svelte generated by Svelte v3.38.3 */

    function create_left_slot(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let loremipsum;
    	let current;
    	loremipsum = new LoremIpsum({});

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Left Sidebar";
    			t1 = space();
    			create_component(loremipsum.$$.fragment);
    			attr(div, "slot", "left");
    			attr(div, "class", "svelte-1q15izp");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(div, t1);
    			mount_component(loremipsum, div, null);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(loremipsum.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loremipsum.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(loremipsum);
    		}
    	};
    }

    // (44:1) 
    function create_right_slot(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let loremipsum;
    	let current;
    	loremipsum = new LoremIpsum({});

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Right Sidebar";
    			t1 = space();
    			create_component(loremipsum.$$.fragment);
    			attr(div, "slot", "right");
    			attr(div, "class", "svelte-1q15izp");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(div, t1);
    			mount_component(loremipsum, div, null);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(loremipsum.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loremipsum.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(loremipsum);
    		}
    	};
    }

    // (48:1) 
    function create_content_slot(ctx) {
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t7;
    	let democontrols;
    	let updating_duration;
    	let t8;
    	let p2;
    	let t12;
    	let loremipsum;
    	let current;

    	function democontrols_duration_binding(value) {
    		/*democontrols_duration_binding*/ ctx[4](value);
    	}

    	let democontrols_props = {
    		leftOpen: /*leftOpen*/ ctx[0],
    		rightOpen: /*rightOpen*/ ctx[1]
    	};

    	if (/*duration*/ ctx[2] !== void 0) {
    		democontrols_props.duration = /*duration*/ ctx[2];
    	}

    	democontrols = new DemoControls({ props: democontrols_props });
    	binding_callbacks.push(() => bind(democontrols, "duration", democontrols_duration_binding));
    	democontrols.$on("toggleLeft", /*toggleLeft_handler*/ ctx[5]);
    	democontrols.$on("toggleRight", /*toggleRight_handler*/ ctx[6]);
    	loremipsum = new LoremIpsum({});

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Svelte Sidebar Panels";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "This component is the classic three-column website layout, where the left and right columns are\n\t\t\t\tcollapsible on smaller screens. (If you've seen the Discord mobile app, it's similar to that.)";
    			t3 = space();
    			p1 = element("p");
    			p1.innerHTML = `For more details, check out the <a href="https://github.com/saibotsivad/svelte-sidebar-panels#readme">documentation</a>.`;
    			t7 = space();
    			create_component(democontrols.$$.fragment);
    			t8 = space();
    			p2 = element("p");
    			p2.innerHTML = `Filler text generated using <a href="http://officeipsum.com/">OfficeIpsum</a>.`;
    			t12 = space();
    			create_component(loremipsum.$$.fragment);
    			attr(p2, "class", "text-muted mb-0 mt-3");
    			attr(div0, "class", "container");
    			attr(div1, "slot", "content");
    			attr(div1, "class", "svelte-1q15izp");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, h1);
    			append(div0, t1);
    			append(div0, p0);
    			append(div0, t3);
    			append(div0, p1);
    			append(div0, t7);
    			mount_component(democontrols, div0, null);
    			append(div0, t8);
    			append(div0, p2);
    			append(div0, t12);
    			mount_component(loremipsum, div0, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const democontrols_changes = {};
    			if (dirty & /*leftOpen*/ 1) democontrols_changes.leftOpen = /*leftOpen*/ ctx[0];
    			if (dirty & /*rightOpen*/ 2) democontrols_changes.rightOpen = /*rightOpen*/ ctx[1];

    			if (!updating_duration && dirty & /*duration*/ 4) {
    				updating_duration = true;
    				democontrols_changes.duration = /*duration*/ ctx[2];
    				add_flush_callback(() => updating_duration = false);
    			}

    			democontrols.$set(democontrols_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(democontrols.$$.fragment, local);
    			transition_in(loremipsum.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(democontrols.$$.fragment, local);
    			transition_out(loremipsum.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(democontrols);
    			destroy_component(loremipsum);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let sidebarpanels;
    	let updating_updatePanels;
    	let current;

    	function sidebarpanels_updatePanels_binding(value) {
    		/*sidebarpanels_updatePanels_binding*/ ctx[7](value);
    	}

    	let sidebarpanels_props = {
    		duration: /*duration*/ ctx[2],
    		$$slots: {
    			content: [create_content_slot],
    			right: [create_right_slot],
    			left: [create_left_slot]
    		},
    		$$scope: { ctx }
    	};

    	if (/*updatePanels*/ ctx[3] !== void 0) {
    		sidebarpanels_props.updatePanels = /*updatePanels*/ ctx[3];
    	}

    	sidebarpanels = new SidebarPanels({ props: sidebarpanels_props });
    	binding_callbacks.push(() => bind(sidebarpanels, "updatePanels", sidebarpanels_updatePanels_binding));
    	sidebarpanels.$on("change", /*change_handler*/ ctx[8]);

    	return {
    		c() {
    			create_component(sidebarpanels.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sidebarpanels, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sidebarpanels_changes = {};
    			if (dirty & /*duration*/ 4) sidebarpanels_changes.duration = /*duration*/ ctx[2];

    			if (dirty & /*$$scope, leftOpen, rightOpen, duration, updatePanels*/ 527) {
    				sidebarpanels_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_updatePanels && dirty & /*updatePanels*/ 8) {
    				updating_updatePanels = true;
    				sidebarpanels_changes.updatePanels = /*updatePanels*/ ctx[3];
    				add_flush_callback(() => updating_updatePanels = false);
    			}

    			sidebarpanels.$set(sidebarpanels_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sidebarpanels.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sidebarpanels.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sidebarpanels, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let leftOpen;
    	let rightOpen;
    	let duration = undefined;
    	let updatePanels;

    	function democontrols_duration_binding(value) {
    		duration = value;
    		$$invalidate(2, duration);
    	}

    	const toggleLeft_handler = () => {
    		updatePanels({ left: !leftOpen });
    	};

    	const toggleRight_handler = () => {
    		updatePanels({ right: !rightOpen });
    	};

    	function sidebarpanels_updatePanels_binding(value) {
    		updatePanels = value;
    		$$invalidate(3, updatePanels);
    	}

    	const change_handler = ({ detail: { left, right } }) => {
    		$$invalidate(0, leftOpen = left);
    		$$invalidate(1, rightOpen = right);
    	};

    	return [
    		leftOpen,
    		rightOpen,
    		duration,
    		updatePanels,
    		democontrols_duration_binding,
    		toggleLeft_handler,
    		toggleRight_handler,
    		sidebarpanels_updatePanels_binding,
    		change_handler
    	];
    }

    class Demo extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const onReady = callback => {
    	const state = document.readyState;
    	if (state === 'complete' || state === 'interactive') {
    		setTimeout(callback, 0);
    	} else {
    		document.addEventListener('DOMContentLoaded', () => {
    			callback();
    		});
    	}
    };

    onReady(() => {
    	new Demo({
    		target: document.querySelector('body'),
    	});
    });

}());
//# sourceMappingURL=app.js.map
