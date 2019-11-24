
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
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
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
            $$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, props) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : prop_values;
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const safeWords = [
        "jesus is a biscuit let him sop me up",
        "lipsync for your life",
        "mother dust",
        "your dad just calls me Katya",
        "big red scare with the long blonde hair",
        "UNHhhh",
        "chunky yet funky",
        "good god get a grip girl",
        "go back to party city where you belong",
        "no tea no shade no pink lemonade",
        "sip some tea",
        "throw some shade",
        "this isn't Rupaul's best friend race",
        "America's next drag superstar",
        "oh, at all",
        "hiiieeeeeeeeeeeeeee",
        "my name is Roxxxy Andrews and I'm here to make it clear",
        "I'd like to keep it on please",
        "serving",
        "party",
        "the library is open",
        "read u wrote u",
        "category is",
        "kiki",
        "look at huh",
        "hey qween",
        "oh pit crew",
        "may I call you jiggly",
        "covergirl",
        "put the bass in that walk",
        "head to toe let your whole body talk",
        "lacefront",
        "death drop",
        "tongue pop",
        "y'all wanted a twist, eh",
        "wig reveal",
        "Paris is burning",
        "realness",
        "water off a duck's back",
        "tuck",
        "shake n' go wigs",
        "bring back my girls",
        "thwoorp",
        "you better work",
        "padding",
        "**rosepetals**",
        "be the strange you wish to see in the world",
        "gender is a construct tear it apart",
        "squirrel friends",
        "if you're not wearing heels you're not doing drag",
        "this is my hair",
        "I don't wear wigs",
        "purse first",
        "you're perfect, you're beautiful, you look like Linda Evangelista",
        "Valentina your smile is beautiful",
        "fan favorite",
        "call me mother",
        "reading is fundatmental",
        "just between us girls",
        "it's monsoon season",
        "condragulations",
        "cucu",
        "yas gawd",
        "untucked",
        "shantay you stay",
        "sashay away",
        "eleganza",
        "toot",
        "boot",
        "sickening",
        "the time has come",
        "I feel very attacked",
        "donut come for me",
        "okurrrrrr",
        "fierce",
        "back rolls",
        "oh honey",
        "not today, Satan",
        "same parts",
        "because what you see isn't always the truth",
        "Being In Total Control of Herself",
        "glamazon",
        "fishy",
        "d to the e to the t to the o to the hold up...x",
        "bring it to the runway",
        "oh no she better don't",
        "now prance, prance I say",
        "herstory",
        "unclockable",
        "your makeup is terrible",
        "radical, magical, liberal art",
        "the body is here",
        "hog body",
        "what category are we on right now",
        "shook",
        "voguing",
        "Rolaskatox",
        "henny",
        "we're all born naked and the rest is drag",
        "jealous of my boogie",
        "because I'm what - sickening",
        "because you are not that king of girl",
        "I don't have a sugar daddy, I've never had a sugar daddy",
        "lipsync assassin",
        "champagne and red M&amp;M's",
        "miss vaaaaaaaaanjie",
        "gagging",
      ];
      
      
    const nsfw = [
        "if you can't love yourself how in the hell you gonna love anybody else can I get an amen up in here",
        "hunty",
        "I'm not joking, bitch",
        "and don't fuck it up",
        "snatch game",
        "kaikai",
        "step your pussy up",
        "get those nuts away from my face",
        "tired-ass showgirl",
        "charisma, uniqueness, nerve and talent",
        "gagging",
        "the only high class Russian whore",
        "fuck my pussy with a rake, Mom",
        "I was raised by wolves bitch",
      ];

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function createNumParagraphs() {
    	const { subscribe, update } = writable(1);
    	return {
    		subscribe,
    		increment: () => update(n => (n<5) ? n + 1 : n),
            decrement: () => update(n => (n>1) ? n - 1 : n)	
        };
    }
    const numParagraphs = createNumParagraphs();

    const numSentences = writable(4);

    const nsfwMode = writable(false);

    /* src/LengthSelect.svelte generated by Svelte v3.14.1 */
    const file = "src/LengthSelect.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let label0;
    	let input0;
    	let input0_value_value;
    	let t2;
    	let span0;
    	let t4;
    	let label1;
    	let input1;
    	let input1_value_value;
    	let t5;
    	let span1;
    	let t7;
    	let label2;
    	let input2;
    	let input2_value_value;
    	let t8;
    	let span2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Paragraph Length";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "Short";
    			t4 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t5 = space();
    			span1 = element("span");
    			span1.textContent = "Medium";
    			t7 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t8 = space();
    			span2 = element("span");
    			span2.textContent = "Long";
    			add_location(h2, file, 5, 4, 75);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "tabindex", "0");
    			input0.__value = input0_value_value = 4;
    			input0.value = input0.__value;
    			attr_dev(input0, "class", "svelte-z1fed5");
    			ctx.$$binding_groups[0].push(input0);
    			add_location(input0, file, 8, 12, 162);
    			attr_dev(span0, "class", "svelte-z1fed5");
    			add_location(span0, file, 9, 12, 243);
    			attr_dev(label0, "class", "svelte-z1fed5");
    			add_location(label0, file, 7, 8, 142);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "tabindex", "0");
    			input1.__value = input1_value_value = 8;
    			input1.value = input1.__value;
    			attr_dev(input1, "class", "svelte-z1fed5");
    			ctx.$$binding_groups[0].push(input1);
    			add_location(input1, file, 13, 12, 308);
    			attr_dev(span1, "class", "svelte-z1fed5");
    			add_location(span1, file, 14, 12, 389);
    			attr_dev(label1, "class", "svelte-z1fed5");
    			add_location(label1, file, 12, 8, 288);
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "tabindex", "0");
    			input2.__value = input2_value_value = 16;
    			input2.value = input2.__value;
    			attr_dev(input2, "class", "svelte-z1fed5");
    			ctx.$$binding_groups[0].push(input2);
    			add_location(input2, file, 18, 12, 455);
    			attr_dev(span2, "class", "svelte-z1fed5");
    			add_location(span2, file, 19, 12, 537);
    			attr_dev(label2, "class", "svelte-z1fed5");
    			add_location(label2, file, 17, 8, 435);
    			attr_dev(div0, "class", "inputContainer svelte-z1fed5");
    			add_location(div0, file, 6, 4, 105);
    			add_location(div1, file, 4, 0, 65);

    			dispose = [
    				listen_dev(input0, "change", ctx.input0_change_handler),
    				listen_dev(input1, "change", ctx.input1_change_handler),
    				listen_dev(input2, "change", ctx.input2_change_handler)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === ctx.$numSentences;
    			append_dev(label0, t2);
    			append_dev(label0, span0);
    			append_dev(div0, t4);
    			append_dev(div0, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === ctx.$numSentences;
    			append_dev(label1, t5);
    			append_dev(label1, span1);
    			append_dev(div0, t7);
    			append_dev(div0, label2);
    			append_dev(label2, input2);
    			input2.checked = input2.__value === ctx.$numSentences;
    			append_dev(label2, t8);
    			append_dev(label2, span2);
    		},
    		p: function update(changed, ctx) {
    			if (changed.$numSentences) {
    				input0.checked = input0.__value === ctx.$numSentences;
    			}

    			if (changed.$numSentences) {
    				input1.checked = input1.__value === ctx.$numSentences;
    			}

    			if (changed.$numSentences) {
    				input2.checked = input2.__value === ctx.$numSentences;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input0), 1);
    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input1), 1);
    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input2), 1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $numSentences;
    	validate_store(numSentences, "numSentences");
    	component_subscribe($$self, numSentences, $$value => $$invalidate("$numSentences", $numSentences = $$value));
    	const $$binding_groups = [[]];

    	function input0_change_handler() {
    		$numSentences = this.__value;
    		numSentences.set($numSentences);
    	}

    	function input1_change_handler() {
    		$numSentences = this.__value;
    		numSentences.set($numSentences);
    	}

    	function input2_change_handler() {
    		$numSentences = this.__value;
    		numSentences.set($numSentences);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$numSentences" in $$props) numSentences.set($numSentences = $$props.$numSentences);
    	};

    	return {
    		$numSentences,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		$$binding_groups
    	};
    }

    class LengthSelect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LengthSelect",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/NumParagraphSelect.svelte generated by Svelte v3.14.1 */
    const file$1 = "src/NumParagraphSelect.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let button0;
    	let t3;
    	let p;
    	let t4;
    	let t5;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Number of Paragraphs";
    			t1 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "<";
    			t3 = space();
    			p = element("p");
    			t4 = text(ctx.$numParagraphs);
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = ">";
    			add_location(h2, file$1, 5, 4, 76);
    			attr_dev(button0, "class", "svelte-1r4bo52");
    			add_location(button0, file$1, 7, 8, 152);
    			attr_dev(p, "class", "numParagraphs svelte-1r4bo52");
    			add_location(p, file$1, 8, 8, 217);
    			attr_dev(button1, "class", "svelte-1r4bo52");
    			add_location(button1, file$1, 9, 8, 271);
    			attr_dev(div0, "class", "numParagraphsSelect svelte-1r4bo52");
    			add_location(div0, file$1, 6, 4, 110);
    			add_location(div1, file$1, 4, 0, 66);

    			dispose = [
    				listen_dev(button0, "click", numParagraphs.decrement, false, false, false),
    				listen_dev(button1, "click", numParagraphs.increment, false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, p);
    			append_dev(p, t4);
    			append_dev(div0, t5);
    			append_dev(div0, button1);
    		},
    		p: function update(changed, ctx) {
    			if (changed.$numParagraphs) set_data_dev(t4, ctx.$numParagraphs);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $numParagraphs;
    	validate_store(numParagraphs, "numParagraphs");
    	component_subscribe($$self, numParagraphs, $$value => $$invalidate("$numParagraphs", $numParagraphs = $$value));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$numParagraphs" in $$props) numParagraphs.set($numParagraphs = $$props.$numParagraphs);
    	};

    	return { $numParagraphs };
    }

    class NumParagraphSelect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumParagraphSelect",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/NSFWcheck.svelte generated by Svelte v3.14.1 */
    const file$2 = "src/NSFWcheck.svelte";

    function create_fragment$2(ctx) {
    	let label;
    	let input;
    	let t0;
    	let span;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			span = element("span");
    			span.textContent = "Add some Charisma, Uniqueness, Nerve, and Talent (NSFW)";
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-1nqlize");
    			add_location(input, file$2, 5, 4, 73);
    			attr_dev(span, "class", "svelte-1nqlize");
    			add_location(span, file$2, 6, 4, 124);
    			attr_dev(label, "class", "svelte-1nqlize");
    			add_location(label, file$2, 4, 0, 61);
    			dispose = listen_dev(input, "change", ctx.input_change_handler);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = ctx.$nsfwMode;
    			append_dev(label, t0);
    			append_dev(label, span);
    		},
    		p: function update(changed, ctx) {
    			if (changed.$nsfwMode) {
    				input.checked = ctx.$nsfwMode;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $nsfwMode;
    	validate_store(nsfwMode, "nsfwMode");
    	component_subscribe($$self, nsfwMode, $$value => $$invalidate("$nsfwMode", $nsfwMode = $$value));

    	function input_change_handler() {
    		$nsfwMode = this.checked;
    		nsfwMode.set($nsfwMode);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$nsfwMode" in $$props) nsfwMode.set($nsfwMode = $$props.$nsfwMode);
    	};

    	return { $nsfwMode, input_change_handler };
    }

    class NSFWcheck extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NSFWcheck",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.14.1 */
    const file$3 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.paragraph = list[i];
    	return child_ctx;
    }

    // (67:2) {#each activeIpsum as paragraph}
    function create_each_block(ctx) {
    	let p;
    	let t_value = ctx.paragraph + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$3, 67, 3, 1503);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(changed, ctx) {
    			if (changed.activeIpsum && t_value !== (t_value = ctx.paragraph + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(67:2) {#each activeIpsum as paragraph}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let section;
    	let t2;
    	let t3;
    	let t4;
    	let button;
    	let t6;
    	let p;
    	let t7;
    	let footer;
    	let span0;
    	let t8;
    	let a0;
    	let t10;
    	let span1;
    	let t11;
    	let a1;
    	let t13;
    	let div;
    	let a2;
    	let t15;
    	let span2;
    	let current;
    	let dispose;
    	const numparagraphsselect = new NumParagraphSelect({ $$inline: true });
    	const lengthselect = new LengthSelect({ $$inline: true });
    	const nsfwcheck = new NSFWcheck({ $$inline: true });
    	let each_value = ctx.activeIpsum;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Drag Race Ipsum";
    			t1 = space();
    			section = element("section");
    			create_component(numparagraphsselect.$$.fragment);
    			t2 = space();
    			create_component(lengthselect.$$.fragment);
    			t3 = space();
    			create_component(nsfwcheck.$$.fragment);
    			t4 = space();
    			button = element("button");
    			button.textContent = "Make Ipsum";
    			t6 = space();
    			p = element("p");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			footer = element("footer");
    			span0 = element("span");
    			t8 = text("Created by ");
    			a0 = element("a");
    			a0.textContent = "Caitlin Haaf";
    			t10 = space();
    			span1 = element("span");
    			t11 = text("View code on ");
    			a1 = element("a");
    			a1.textContent = "Github";
    			t13 = space();
    			div = element("div");
    			a2 = element("a");
    			a2.textContent = "Tweet";
    			t15 = space();
    			span2 = element("span");
    			span2.textContent = "Share on Twitter";
    			add_location(h1, file$3, 52, 1, 1281);
    			attr_dev(section, "class", "twoCol");
    			add_location(section, file$3, 54, 1, 1308);
    			attr_dev(button, "class", "svelte-jivzke");
    			add_location(button, file$3, 61, 1, 1405);
    			add_location(p, file$3, 65, 1, 1461);
    			attr_dev(a0, "href", "http://www.caitlinhaaf.com");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener noreferrer");
    			add_location(a0, file$3, 72, 19, 1568);
    			add_location(span0, file$3, 72, 2, 1551);
    			attr_dev(a1, "href", "https://github.com/caitlinhaaf/dragipsum");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener noreferrer");
    			add_location(a1, file$3, 73, 21, 1692);
    			add_location(span1, file$3, 73, 2, 1673);
    			attr_dev(a2, "class", "twitter-share-button");
    			attr_dev(a2, "href", "https://twitter.com/intent/tweet?text=Hello%20world");
    			attr_dev(a2, "data-size", "large");
    			add_location(a2, file$3, 75, 3, 1814);
    			add_location(span2, file$3, 78, 3, 1943);
    			add_location(div, file$3, 74, 2, 1805);
    			add_location(footer, file$3, 71, 1, 1540);
    			attr_dev(main, "class", "svelte-jivzke");
    			add_location(main, file$3, 51, 0, 1273);
    			dispose = listen_dev(button, "click", ctx.getIpsum, false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, section);
    			mount_component(numparagraphsselect, section, null);
    			append_dev(section, t2);
    			mount_component(lengthselect, section, null);
    			append_dev(main, t3);
    			mount_component(nsfwcheck, main, null);
    			append_dev(main, t4);
    			append_dev(main, button);
    			append_dev(main, t6);
    			append_dev(main, p);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(p, null);
    			}

    			append_dev(main, t7);
    			append_dev(main, footer);
    			append_dev(footer, span0);
    			append_dev(span0, t8);
    			append_dev(span0, a0);
    			append_dev(footer, t10);
    			append_dev(footer, span1);
    			append_dev(span1, t11);
    			append_dev(span1, a1);
    			append_dev(footer, t13);
    			append_dev(footer, div);
    			append_dev(div, a2);
    			append_dev(div, t15);
    			append_dev(div, span2);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			if (changed.activeIpsum) {
    				each_value = ctx.activeIpsum;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(p, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numparagraphsselect.$$.fragment, local);
    			transition_in(lengthselect.$$.fragment, local);
    			transition_in(nsfwcheck.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numparagraphsselect.$$.fragment, local);
    			transition_out(lengthselect.$$.fragment, local);
    			transition_out(nsfwcheck.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(numparagraphsselect);
    			destroy_component(lengthselect);
    			destroy_component(nsfwcheck);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let activeIpsum = [];
    	let numParagraphs_value, numSentence_value;

    	const unsubscribeParagraphs = numParagraphs.subscribe(value => {
    		numParagraphs_value = value;
    	});

    	const unsubscribeSentences = numSentences.subscribe(value => {
    		numSentence_value = value;
    	});

    	function getIpsum() {
    		let ipsum = [];
    		let i = 0;

    		while (i < numParagraphs_value) {
    			ipsum = [...ipsum, `${buildParagraph()}`];
    			i++;
    		}

    		$$invalidate("activeIpsum", activeIpsum = ipsum);
    	}

    	function buildParagraph() {
    		let paragraph = ``;
    		let i = 0;

    		while (i < numSentence_value) {
    			paragraph += `${buildSentence()}`;
    			i++;
    		}

    		return paragraph;
    	}

    	function buildSentence() {
    		let i = 0;
    		let sentence = ``;

    		while (i < 5) {
    			const phrase = allPhrases[Math.floor(allPhrases.length * Math.random())];

    			sentence += `${i === 0
			? ` ${phrase.charAt(0).toUpperCase()}` + phrase.substring(1)
			: phrase}${i === 4 ? `.` : ` `}`;

    			i++;
    		}

    		return sentence;
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("activeIpsum" in $$props) $$invalidate("activeIpsum", activeIpsum = $$props.activeIpsum);
    		if ("numParagraphs_value" in $$props) numParagraphs_value = $$props.numParagraphs_value;
    		if ("numSentence_value" in $$props) numSentence_value = $$props.numSentence_value;
    		if ("allPhrases" in $$props) allPhrases = $$props.allPhrases;
    	};

    	let allPhrases;
    	 allPhrases = nsfwMode ? [...safeWords, ...nsfw] : [...safeWords];
    	return { activeIpsum, getIpsum };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    // import "./main.css";

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
