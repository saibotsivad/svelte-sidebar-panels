
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});
    const get_right_slot_changes = dirty => ({});
    const get_right_slot_context = ctx => ({});
    const get_left_slot_changes = dirty => ({});
    const get_left_slot_context = ctx => ({});

    // (75:0) {#if $$slots.left}
    function create_if_block_1(ctx) {
    	let div;
    	let current;
    	const left_slot_template = /*#slots*/ ctx[17].left;
    	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[16], get_left_slot_context);

    	return {
    		c() {
    			div = element("div");
    			if (left_slot) left_slot.c();
    			attr(div, "style", /*leftMenuStyle*/ ctx[0]);
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
    				if (left_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
    					update_slot(left_slot, left_slot_template, ctx, /*$$scope*/ ctx[16], !current ? -1 : dirty, get_left_slot_changes, get_left_slot_context);
    				}
    			}

    			if (!current || dirty & /*leftMenuStyle*/ 1) {
    				attr(div, "style", /*leftMenuStyle*/ ctx[0]);
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

    // (81:0) {#if $$slots.right}
    function create_if_block(ctx) {
    	let div;
    	let current;
    	const right_slot_template = /*#slots*/ ctx[17].right;
    	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[16], get_right_slot_context);

    	return {
    		c() {
    			div = element("div");
    			if (right_slot) right_slot.c();
    			attr(div, "style", /*rightMenuStyle*/ ctx[1]);
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
    				if (right_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
    					update_slot(right_slot, right_slot_template, ctx, /*$$scope*/ ctx[16], !current ? -1 : dirty, get_right_slot_changes, get_right_slot_context);
    				}
    			}

    			if (!current || dirty & /*rightMenuStyle*/ 2) {
    				attr(div, "style", /*rightMenuStyle*/ ctx[1]);
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

    function create_fragment$1(ctx) {
    	let t0;
    	let t1;
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$$slots*/ ctx[4].left && create_if_block_1(ctx);
    	let if_block1 = /*$$slots*/ ctx[4].right && create_if_block(ctx);
    	const content_slot_template = /*#slots*/ ctx[17].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[16], get_content_slot_context);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			div = element("div");
    			if (content_slot) content_slot.c();
    			attr(div, "style", /*contentStyle*/ ctx[2]);
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);

    			if (content_slot) {
    				content_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(window_1, "resize", /*resizeToggle*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*$$slots*/ ctx[4].left) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 16) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*$$slots*/ ctx[4].right) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (content_slot) {
    				if (content_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
    					update_slot(content_slot, content_slot_template, ctx, /*$$scope*/ ctx[16], !current ? -1 : dirty, get_content_slot_changes, get_content_slot_context);
    				}
    			}

    			if (!current || dirty & /*contentStyle*/ 4) {
    				attr(div, "style", /*contentStyle*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(content_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(content_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			if (content_slot) content_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let leftSpacingWidth;
    	let rightSpacingWidth;
    	let contentNegativeWidth;
    	let leftMenuStyle;
    	let rightMenuStyle;
    	let contentStyle;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { leftOpen } = $$props;
    	let { rightOpen } = $$props;
    	let { leftOpenBreakpoint = 768 } = $$props;
    	let { rightOpenBreakpoint = 1200 } = $$props;

    	const resizeToggle = () => {
    		if (leftOpenBreakpoint && window.innerWidth > leftOpenBreakpoint) {
    			$$invalidate(5, leftOpen = true);
    		}

    		if (rightOpenBreakpoint && window.innerWidth > rightOpenBreakpoint) {
    			$$invalidate(6, rightOpen = true);
    		}

    		if (leftOpenBreakpoint && window.innerWidth < leftOpenBreakpoint) {
    			$$invalidate(5, leftOpen = false);
    		}

    		if (rightOpenBreakpoint && window.innerWidth < rightOpenBreakpoint) {
    			$$invalidate(6, rightOpen = false);
    		}
    	};

    	onMount(resizeToggle);
    	let { width = "200px" } = $$props;
    	let { leftWidth } = $$props;
    	let { rightWidth } = $$props;
    	let { duration = "0.08s" } = $$props;

    	const makeMenuStyle = (side, width) => `
		position: absolute;
		top: 0;
		bottom: 0;
		${side}: 0;
		width: ${width};
	`;

    	$$self.$$set = $$props => {
    		if ("leftOpen" in $$props) $$invalidate(5, leftOpen = $$props.leftOpen);
    		if ("rightOpen" in $$props) $$invalidate(6, rightOpen = $$props.rightOpen);
    		if ("leftOpenBreakpoint" in $$props) $$invalidate(7, leftOpenBreakpoint = $$props.leftOpenBreakpoint);
    		if ("rightOpenBreakpoint" in $$props) $$invalidate(8, rightOpenBreakpoint = $$props.rightOpenBreakpoint);
    		if ("width" in $$props) $$invalidate(9, width = $$props.width);
    		if ("leftWidth" in $$props) $$invalidate(10, leftWidth = $$props.leftWidth);
    		if ("rightWidth" in $$props) $$invalidate(11, rightWidth = $$props.rightWidth);
    		if ("duration" in $$props) $$invalidate(12, duration = $$props.duration);
    		if ("$$scope" in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*leftOpen, leftWidth, width*/ 1568) {
    			$$invalidate(13, leftSpacingWidth = leftOpen ? leftWidth || width : "0px");
    		}

    		if ($$self.$$.dirty & /*rightOpen, rightWidth, width*/ 2624) {
    			$$invalidate(14, rightSpacingWidth = rightOpen ? rightWidth || width : "0px");
    		}

    		if ($$self.$$.dirty & /*leftSpacingWidth, rightSpacingWidth*/ 24576) {
    			$$invalidate(15, contentNegativeWidth = `${leftSpacingWidth} - ${rightSpacingWidth}`);
    		}

    		if ($$self.$$.dirty & /*leftWidth, width*/ 1536) {
    			$$invalidate(0, leftMenuStyle = makeMenuStyle("left", leftWidth || width));
    		}

    		if ($$self.$$.dirty & /*rightWidth, width*/ 2560) {
    			$$invalidate(1, rightMenuStyle = makeMenuStyle("right", rightWidth || width));
    		}

    		if ($$self.$$.dirty & /*leftSpacingWidth, contentNegativeWidth, duration*/ 45056) {
    			$$invalidate(2, contentStyle = `
		position: absolute;
		top: 0;
		bottom: 0;
		left: ${leftSpacingWidth};
		width: calc(100% - ${contentNegativeWidth});
		transition: width ${duration} ease-in-out, left ${duration} ease-in-out;
	`);
    		}
    	};

    	return [
    		leftMenuStyle,
    		rightMenuStyle,
    		contentStyle,
    		resizeToggle,
    		$$slots,
    		leftOpen,
    		rightOpen,
    		leftOpenBreakpoint,
    		rightOpenBreakpoint,
    		width,
    		leftWidth,
    		rightWidth,
    		duration,
    		leftSpacingWidth,
    		rightSpacingWidth,
    		contentNegativeWidth,
    		$$scope,
    		slots
    	];
    }

    class SidebarPanels extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			leftOpen: 5,
    			rightOpen: 6,
    			leftOpenBreakpoint: 7,
    			rightOpenBreakpoint: 8,
    			width: 9,
    			leftWidth: 10,
    			rightWidth: 11,
    			duration: 12
    		});
    	}
    }

    /* src/Demo.svelte generated by Svelte v3.38.3 */

    function create_left_slot(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "left menu area with many words that are wrapping eventually so you can see the draw\n\t\tleft menu area with many words that are wrapping eventually so you can see the draw\n\t\tleft menu area with many words that are wrapping eventually so you can see the draw\n\t\tleft menu area with many words that are wrapping eventually so you can see the draw\n\t\tleft menu area with many words that are wrapping eventually so you can see the draw";
    			attr(div, "slot", "left");
    			attr(div, "class", "svelte-16emhvt");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (35:1) 
    function create_right_slot(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "right menu area with many words that are wrapping eventually so you can see the draw\n\t\tright menu area with many words that are wrapping eventually so you can see the draw\n\t\tright menu area with many words that are wrapping eventually so you can see the draw\n\t\tright menu area with many words that are wrapping eventually so you can see the draw\n\t\tright menu area with many words that are wrapping eventually so you can see the draw";
    			attr(div, "slot", "right");
    			attr(div, "class", "svelte-16emhvt");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (42:1) 
    function create_content_slot(ctx) {
    	let div;
    	let p;
    	let t1;
    	let button0;
    	let t2;
    	let t3_value = (/*leftOpen*/ ctx[0] ? "opened" : "closed") + "";
    	let t3;
    	let t4;
    	let t5;
    	let button1;
    	let t6;
    	let t7_value = (/*rightOpen*/ ctx[1] ? "opened" : "closed") + "";
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "content area with many words that are wrapping eventually so you can see the draw\n\t\t\tcontent area with many words that are wrapping eventually so you can see the draw\n\t\t\tcontent area with many words that are wrapping eventually so you can see the draw\n\t\t\tcontent area with many words that are wrapping eventually so you can see the draw\n\t\t\tcontent area with many words that are wrapping eventually so you can see the draw\n\t\t\tcontent area with many words that are wrapping eventually so you can see the draw";
    			t1 = space();
    			button0 = element("button");
    			t2 = text("toggle left (");
    			t3 = text(t3_value);
    			t4 = text(")");
    			t5 = space();
    			button1 = element("button");
    			t6 = text("toggle right (");
    			t7 = text(t7_value);
    			t8 = text(")");
    			attr(div, "slot", "content");
    			attr(div, "class", "svelte-16emhvt");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p);
    			append(div, t1);
    			append(div, button0);
    			append(button0, t2);
    			append(button0, t3);
    			append(button0, t4);
    			append(div, t5);
    			append(div, button1);
    			append(button1, t6);
    			append(button1, t7);
    			append(button1, t8);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[3]),
    					listen(button1, "click", /*click_handler_1*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*leftOpen*/ 1 && t3_value !== (t3_value = (/*leftOpen*/ ctx[0] ? "opened" : "closed") + "")) set_data(t3, t3_value);
    			if (dirty & /*rightOpen*/ 2 && t7_value !== (t7_value = (/*rightOpen*/ ctx[1] ? "opened" : "closed") + "")) set_data(t7, t7_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let sidebarpanels;
    	let updating_leftOpen;
    	let updating_rightOpen;
    	let updating_scrim;
    	let current;

    	function sidebarpanels_leftOpen_binding(value) {
    		/*sidebarpanels_leftOpen_binding*/ ctx[5](value);
    	}

    	function sidebarpanels_rightOpen_binding(value) {
    		/*sidebarpanels_rightOpen_binding*/ ctx[6](value);
    	}

    	function sidebarpanels_scrim_binding(value) {
    		/*sidebarpanels_scrim_binding*/ ctx[7](value);
    	}

    	let sidebarpanels_props = {
    		leftWidth: "300px",
    		$$slots: {
    			content: [create_content_slot],
    			right: [create_right_slot],
    			left: [create_left_slot]
    		},
    		$$scope: { ctx }
    	};

    	if (/*leftOpen*/ ctx[0] !== void 0) {
    		sidebarpanels_props.leftOpen = /*leftOpen*/ ctx[0];
    	}

    	if (/*rightOpen*/ ctx[1] !== void 0) {
    		sidebarpanels_props.rightOpen = /*rightOpen*/ ctx[1];
    	}

    	if (/*scrim*/ ctx[2] !== void 0) {
    		sidebarpanels_props.scrim = /*scrim*/ ctx[2];
    	}

    	sidebarpanels = new SidebarPanels({ props: sidebarpanels_props });
    	binding_callbacks.push(() => bind(sidebarpanels, "leftOpen", sidebarpanels_leftOpen_binding));
    	binding_callbacks.push(() => bind(sidebarpanels, "rightOpen", sidebarpanels_rightOpen_binding));
    	binding_callbacks.push(() => bind(sidebarpanels, "scrim", sidebarpanels_scrim_binding));

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

    			if (dirty & /*$$scope, rightOpen, leftOpen*/ 259) {
    				sidebarpanels_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_leftOpen && dirty & /*leftOpen*/ 1) {
    				updating_leftOpen = true;
    				sidebarpanels_changes.leftOpen = /*leftOpen*/ ctx[0];
    				add_flush_callback(() => updating_leftOpen = false);
    			}

    			if (!updating_rightOpen && dirty & /*rightOpen*/ 2) {
    				updating_rightOpen = true;
    				sidebarpanels_changes.rightOpen = /*rightOpen*/ ctx[1];
    				add_flush_callback(() => updating_rightOpen = false);
    			}

    			if (!updating_scrim && dirty & /*scrim*/ 4) {
    				updating_scrim = true;
    				sidebarpanels_changes.scrim = /*scrim*/ ctx[2];
    				add_flush_callback(() => updating_scrim = false);
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
    	let scrim;

    	const click_handler = () => {
    		$$invalidate(0, leftOpen = !leftOpen);
    	};

    	const click_handler_1 = () => {
    		$$invalidate(1, rightOpen = !rightOpen);
    	};

    	function sidebarpanels_leftOpen_binding(value) {
    		leftOpen = value;
    		$$invalidate(0, leftOpen);
    	}

    	function sidebarpanels_rightOpen_binding(value) {
    		rightOpen = value;
    		$$invalidate(1, rightOpen);
    	}

    	function sidebarpanels_scrim_binding(value) {
    		scrim = value;
    		$$invalidate(2, scrim);
    	}

    	return [
    		leftOpen,
    		rightOpen,
    		scrim,
    		click_handler,
    		click_handler_1,
    		sidebarpanels_leftOpen_binding,
    		sidebarpanels_rightOpen_binding,
    		sidebarpanels_scrim_binding
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
    	const demo = new Demo({
    		target: document.querySelector('body'),
    	});
    	demo.$on('foo', ({ detail }) => {
    		console.log('foo', detail);
    	});
    });

}());
