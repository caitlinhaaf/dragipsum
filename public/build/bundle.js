
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
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
        $capture_state() { }
        $inject_state() { }
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

    /* src\Lipstick.svelte generated by Svelte v3.20.1 */
    const file = "src\\Lipstick.svelte";

    function create_fragment(ctx) {
    	let svg;
    	let defs;
    	let style;
    	let t0;
    	let title;
    	let t1;
    	let g0;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let g1;
    	let path4;
    	let path5;
    	let ellipse;
    	let path6;
    	let path7;
    	let path8;
    	let path9;
    	let path10;
    	let path11;
    	let path12;
    	let path13;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			style = svg_element("style");
    			t0 = text(".cls-1{fill:#f9557b;}\r\n            .cls-2{fill:#b2325a;}\r\n            .cls-3{fill:#bb32a1;}\r\n            .cls-4{fill:#841e76;}\r\n            .cls-5{fill:none;stroke:#841e76;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px;}\r\n        ");
    			title = svg_element("title");
    			t1 = text("Lipstick Length Icon");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			g1 = svg_element("g");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			ellipse = svg_element("ellipse");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			path13 = svg_element("path");
    			add_location(style, file, 12, 8, 297);
    			add_location(defs, file, 11, 4, 281);
    			add_location(title, file, 20, 4, 588);
    			attr_dev(path0, "class", "cls-1");
    			attr_dev(path0, "d", "M200.44,467c-21.36,0-39.14-10.1-39.89-15.15l0-.13V207.15c5.38,2.4,50.36,22.7,65.28,36.27,10.73,9.76,13.71,18.88,14.53,23.44l0,.25a18.71,18.71,0,0,1,0,6.93l-.08.32a1,1,0,0,0,.06.65V451.72l0,.13C239.58,456.9,221.8,467,200.44,467Z");
    			add_location(path0, file, 25, 8, 748);
    			attr_dev(path1, "class", "cls-2");
    			attr_dev(path1, "d", "M161.52,208.69c9.31,4.21,49.7,22.82,63.61,35.47,10.51,9.56,13.42,18.44,14.22,22.88l0,.13,0,.1a17.82,17.82,0,0,1,0,6.56l0,.1,0,.19a1.94,1.94,0,0,0,0,1.07V451.6s0,.07,0,.1c-.55,3.68-16.58,14.3-38.9,14.3s-38.35-10.62-38.9-14.3c0,0,0-.06,0-.1V208.69m-2-3.5s0,0,0,0V452h0c.83,5.56,18.81,16,40.88,16s40.05-10.44,40.88-16h0V274.68l-.09-.08.09-.35a19.64,19.64,0,0,0,0-7.32,2,2,0,0,0-.05-.24c-1.22-6.77-5.46-15.48-14.84-24C210.37,228,160.4,206,160.4,206s-.71-.81-.86-.81Z");
    			add_location(path1, file, 25, 261, 1001);
    			attr_dev(path2, "class", "cls-1");
    			attr_dev(path2, "d", "M229.68,279.9c-6.86,0-14.82-3.81-22.42-10.72-15.35-14-43.52-59.06-46.2-63.37,9.47,4.38,50.72,23.86,64.74,36.61,10.73,9.76,13.71,18.88,14.53,23.44l0,.25a18.71,18.71,0,0,1,0,6.93,7.81,7.81,0,0,1-1.16,2.88c-1.75,2.5-5.32,4-9.54,4Z");
    			add_location(path2, file, 25, 749, 1489);
    			attr_dev(path3, "class", "cls-2");
    			attr_dev(path3, "d", "M163.68,208.13c13.16,6.19,48.7,23.44,61.45,35,10.51,9.56,13.42,18.44,14.22,22.88l0,.13,0,.1a17.82,17.82,0,0,1,0,6.56,7.12,7.12,0,0,1-1,2.52c-1.56,2.22-4.82,3.55-8.72,3.55-6.61,0-14.33-3.71-21.75-10.46-12.68-11.53-35.68-46.65-44.25-60.31M159.52,204s-.4,1.78.48,2c3.83,6.27,31.59,50.28,46.58,63.92,8.91,8.1,17,11,23.1,11,4.93,0,8.58-1.88,10.36-4.4a8.94,8.94,0,0,0,1.32-3.25,19.64,19.64,0,0,0,0-7.32,2,2,0,0,0-.05-.24c-1.22-6.77-5.46-15.48-14.84-24C210.37,227,159.52,204,159.52,204Z");
    			add_location(path3, file, 25, 1002, 1742);
    			attr_dev(g0, "id", "lipstickProduct");
    			attr_dev(g0, "class", "svelte-1mhbnff");
    			toggle_class(g0, "long", /*lengthClass*/ ctx[0] === 16);
    			toggle_class(g0, "medium", /*lengthClass*/ ctx[0] === 8);
    			add_location(g0, file, 21, 4, 629);
    			attr_dev(path4, "class", "cls-3");
    			attr_dev(path4, "d", "M200,590c-35.84,0-65-10.77-65-24V436H265V566C265,579.23,235.84,590,200,590Z");
    			add_location(path4, file, 27, 34, 2297);
    			attr_dev(path5, "class", "cls-4");
    			attr_dev(path5, "d", "M264,437V566c0,11.11-25.72,23-64,23s-64-11.89-64-23V437H264m2-2H134V566c0,13.81,29.55,25,66,25s66-11.19,66-25V435Z");
    			add_location(path5, file, 27, 135, 2398);
    			attr_dev(ellipse, "class", "cls-3");
    			attr_dev(ellipse, "cx", "200");
    			attr_dev(ellipse, "cy", "436");
    			attr_dev(ellipse, "rx", "65");
    			attr_dev(ellipse, "ry", "27");
    			add_location(ellipse, file, 27, 275, 2538);
    			attr_dev(path6, "class", "cls-4");
    			attr_dev(path6, "d", "M200,410c34.69,0,64,11.91,64,26s-29.31,26-64,26-64-11.91-64-26,29.31-26,64-26m0-2c-36.45,0-66,12.54-66,28s29.55,28,66,28,66-12.54,66-28-29.55-28-66-28Z");
    			add_location(path6, file, 27, 333, 2596);
    			attr_dev(path7, "class", "cls-3");
    			attr_dev(path7, "d", "M200,450c-13.78,0-27-1.92-37.12-5.41-9.51-3.27-15.17-7.52-15.53-11.68a.63.63,0,0,0,0-.19V319.53l19.28,8.39.12,0,34.6,10a.9.9,0,0,0,.28,0l.21,0,32.4-7a1.2,1.2,0,0,0,.31-.13l18.16-11.07v113a.57.57,0,0,0,0,.18C252,441,230.16,450,200,450Z");
    			add_location(path7, file, 27, 510, 2773);
    			attr_dev(path8, "class", "cls-4");
    			attr_dev(path8, "d", "M148.32,321.05l17.88,7.78.24.09,34.6,10a2.16,2.16,0,0,0,.56.08A2,2,0,0,0,202,339l32.4-7a2,2,0,0,0,.62-.24l16.64-10.15V432.61l0,.22c-.32,3.69-5.87,7.73-14.86,10.82-10,3.45-23.12,5.35-36.79,5.35-28.76,0-51-8.54-51.65-16.17l0-.22V321.05M253.68,318,234,330l-32.4,7L167,327l-20.68-9V433h0c.81,9.43,24.51,18,53.64,18s52.83-8.57,53.64-18h0V318Z");
    			add_location(path8, file, 27, 770, 3033);
    			attr_dev(path9, "class", "cls-4");
    			attr_dev(path9, "d", "M172,336a65.65,65.65,0,0,1-15-6V441.23c2.37,1.26,7,3.31,15,5.13Z");
    			add_location(path9, file, 27, 1133, 3396);
    			attr_dev(path10, "class", "cls-4");
    			attr_dev(path10, "d", "M146,449.84V578.31A94.24,94.24,0,0,0,188,589V461.77A99.8,99.8,0,0,1,146,449.84Z");
    			add_location(path10, file, 27, 1223, 3486);
    			attr_dev(path11, "class", "cls-5");
    			attr_dev(path11, "d", "M135,464c0,15.46,28.55,28,65,28s65-12.54,65-28");
    			add_location(path11, file, 27, 1328, 3591);
    			attr_dev(path12, "class", "cls-3");
    			attr_dev(path12, "d", "M200,339c-29.05,0-52.68-10.09-52.68-22.5,0-5.14,4.22-10.14,11.93-14.17v6.53a10.4,10.4,0,0,0-.5,3.14c0,11.21,18.23,20,41.5,20s41.5-8.79,41.5-20a10.4,10.4,0,0,0-.5-3.14V302.6c7.39,4,11.43,8.89,11.43,13.9C252.68,328.91,229.05,339,200,339Z");
    			add_location(path12, file, 27, 1400, 3663);
    			attr_dev(path13, "class", "cls-4");
    			attr_dev(path13, "d", "M158.25,304v4.69a11.32,11.32,0,0,0-.5,3.29c0,11.78,18.67,21,42.5,21s42.5-9.22,42.5-21a11.32,11.32,0,0,0-.5-3.29v-4.39c6.11,3.63,9.43,7.89,9.43,12.18C251.68,328.15,228,338,200,338s-51.68-9.85-51.68-21.5c0-4.43,3.5-8.79,9.93-12.48m2-3.31c-8.66,4.17-13.93,9.71-13.93,15.79,0,13,24,23.5,53.68,23.5s53.68-10.52,53.68-23.5c0-6-5.08-11.4-13.43-15.54V309a9.23,9.23,0,0,1,.5,3c0,10.49-18.13,19-40.5,19s-40.5-8.51-40.5-19a9.23,9.23,0,0,1,.5-3v-8.31Z");
    			add_location(path13, file, 27, 1661, 3924);
    			attr_dev(g1, "id", "lipstickComponent");
    			add_location(g1, file, 27, 8, 2271);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "100 100 200 500");
    			attr_dev(svg, "class", "svgViewBox svelte-1mhbnff");
    			add_location(svg, file, 10, 0, 190);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, defs);
    			append_dev(defs, style);
    			append_dev(style, t0);
    			append_dev(svg, title);
    			append_dev(title, t1);
    			append_dev(svg, g0);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    			append_dev(g0, path2);
    			append_dev(g0, path3);
    			append_dev(svg, g1);
    			append_dev(g1, path4);
    			append_dev(g1, path5);
    			append_dev(g1, ellipse);
    			append_dev(g1, path6);
    			append_dev(g1, path7);
    			append_dev(g1, path8);
    			append_dev(g1, path9);
    			append_dev(g1, path10);
    			append_dev(g1, path11);
    			append_dev(g1, path12);
    			append_dev(g1, path13);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*lengthClass*/ 1) {
    				toggle_class(g0, "long", /*lengthClass*/ ctx[0] === 16);
    			}

    			if (dirty & /*lengthClass*/ 1) {
    				toggle_class(g0, "medium", /*lengthClass*/ ctx[0] === 8);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
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
    	let lengthClass;

    	numSentences.subscribe(value => {
    		$$invalidate(0, lengthClass = value);
    	}); // 4, 8, 16

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Lipstick> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Lipstick", $$slots, []);
    	$$self.$capture_state = () => ({ numSentences, lengthClass });

    	$$self.$inject_state = $$props => {
    		if ("lengthClass" in $$props) $$invalidate(0, lengthClass = $$props.lengthClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [lengthClass];
    }

    class Lipstick extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lipstick",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\LengthSelect.svelte generated by Svelte v3.20.1 */
    const file$1 = "src\\LengthSelect.svelte";

    function create_fragment$1(ctx) {
    	let div2;
    	let h2;
    	let t1;
    	let div1;
    	let t2;
    	let div0;
    	let label0;
    	let input0;
    	let input0_value_value;
    	let t3;
    	let span0;
    	let t5;
    	let label1;
    	let input1;
    	let input1_value_value;
    	let t6;
    	let span1;
    	let t8;
    	let label2;
    	let input2;
    	let input2_value_value;
    	let t9;
    	let span2;
    	let current;
    	let dispose;
    	const lipstick = new Lipstick({ props: { class: "svg" }, $$inline: true });

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Paragraph Length";
    			t1 = space();
    			div1 = element("div");
    			create_component(lipstick.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t3 = space();
    			span0 = element("span");
    			span0.textContent = "Short";
    			t5 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t6 = space();
    			span1 = element("span");
    			span1.textContent = "Medium";
    			t8 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t9 = space();
    			span2 = element("span");
    			span2.textContent = "Long";
    			add_location(h2, file$1, 6, 4, 126);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "tabindex", "0");
    			input0.__value = input0_value_value = 4;
    			input0.value = input0.__value;
    			attr_dev(input0, "class", "svelte-pl9gga");
    			/*$$binding_groups*/ ctx[2][0].push(input0);
    			add_location(input0, file$1, 14, 16, 300);
    			attr_dev(span0, "class", "svelte-pl9gga");
    			add_location(span0, file$1, 15, 16, 386);
    			attr_dev(label0, "class", "svelte-pl9gga");
    			add_location(label0, file$1, 13, 12, 275);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "tabindex", "0");
    			input1.__value = input1_value_value = 8;
    			input1.value = input1.__value;
    			attr_dev(input1, "class", "svelte-pl9gga");
    			/*$$binding_groups*/ ctx[2][0].push(input1);
    			add_location(input1, file$1, 19, 16, 467);
    			attr_dev(span1, "class", "svelte-pl9gga");
    			add_location(span1, file$1, 20, 16, 553);
    			attr_dev(label1, "class", "svelte-pl9gga");
    			add_location(label1, file$1, 18, 12, 442);
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "tabindex", "0");
    			input2.__value = input2_value_value = 16;
    			input2.value = input2.__value;
    			attr_dev(input2, "class", "svelte-pl9gga");
    			/*$$binding_groups*/ ctx[2][0].push(input2);
    			add_location(input2, file$1, 24, 16, 635);
    			attr_dev(span2, "class", "svelte-pl9gga");
    			add_location(span2, file$1, 25, 16, 722);
    			attr_dev(label2, "class", "svelte-pl9gga");
    			add_location(label2, file$1, 23, 12, 610);
    			attr_dev(div0, "class", "inputContainer");
    			add_location(div0, file$1, 12, 8, 233);
    			attr_dev(div1, "class", "flexContainer svelte-pl9gga");
    			add_location(div1, file$1, 8, 4, 159);
    			add_location(div2, file$1, 5, 0, 115);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(lipstick, div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === /*$numSentences*/ ctx[0];
    			append_dev(label0, t3);
    			append_dev(label0, span0);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === /*$numSentences*/ ctx[0];
    			append_dev(label1, t6);
    			append_dev(label1, span1);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(label2, input2);
    			input2.checked = input2.__value === /*$numSentences*/ ctx[0];
    			append_dev(label2, t9);
    			append_dev(label2, span2);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[1]),
    				listen_dev(input1, "change", /*input1_change_handler*/ ctx[3]),
    				listen_dev(input2, "change", /*input2_change_handler*/ ctx[4])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$numSentences*/ 1) {
    				input0.checked = input0.__value === /*$numSentences*/ ctx[0];
    			}

    			if (dirty & /*$numSentences*/ 1) {
    				input1.checked = input1.__value === /*$numSentences*/ ctx[0];
    			}

    			if (dirty & /*$numSentences*/ 1) {
    				input2.checked = input2.__value === /*$numSentences*/ ctx[0];
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(lipstick.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(lipstick.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(lipstick);
    			/*$$binding_groups*/ ctx[2][0].splice(/*$$binding_groups*/ ctx[2][0].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[2][0].splice(/*$$binding_groups*/ ctx[2][0].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[2][0].splice(/*$$binding_groups*/ ctx[2][0].indexOf(input2), 1);
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
    	let $numSentences;
    	validate_store(numSentences, "numSentences");
    	component_subscribe($$self, numSentences, $$value => $$invalidate(0, $numSentences = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LengthSelect> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("LengthSelect", $$slots, []);
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

    	$$self.$capture_state = () => ({ numSentences, Lipstick, $numSentences });

    	return [
    		$numSentences,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		input2_change_handler
    	];
    }

    class LengthSelect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LengthSelect",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\NumParagraphSelect.svelte generated by Svelte v3.20.1 */
    const file$2 = "src\\NumParagraphSelect.svelte";

    function create_fragment$2(ctx) {
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
    			t4 = text(/*$numParagraphs*/ ctx[0]);
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = ">";
    			add_location(h2, file$2, 5, 4, 81);
    			attr_dev(button0, "class", "svelte-1h4h990");
    			add_location(button0, file$2, 7, 8, 159);
    			attr_dev(p, "class", "numParagraphs svelte-1h4h990");
    			add_location(p, file$2, 8, 8, 225);
    			attr_dev(button1, "class", "svelte-1h4h990");
    			add_location(button1, file$2, 9, 8, 280);
    			attr_dev(div0, "class", "numParagraphsSelect svelte-1h4h990");
    			add_location(div0, file$2, 6, 4, 116);
    			add_location(div1, file$2, 4, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
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
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", numParagraphs.decrement, false, false, false),
    				listen_dev(button1, "click", numParagraphs.increment, false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$numParagraphs*/ 1) set_data_dev(t4, /*$numParagraphs*/ ctx[0]);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $numParagraphs;
    	validate_store(numParagraphs, "numParagraphs");
    	component_subscribe($$self, numParagraphs, $$value => $$invalidate(0, $numParagraphs = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NumParagraphSelect> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NumParagraphSelect", $$slots, []);
    	$$self.$capture_state = () => ({ numParagraphs, $numParagraphs });
    	return [$numParagraphs];
    }

    class NumParagraphSelect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumParagraphSelect",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\NSFWcheck.svelte generated by Svelte v3.20.1 */
    const file$3 = "src\\NSFWcheck.svelte";

    function create_fragment$3(ctx) {
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
    			attr_dev(input, "class", "svelte-iw29za");
    			add_location(input, file$3, 5, 4, 78);
    			attr_dev(span, "class", "svelte-iw29za");
    			add_location(span, file$3, 6, 4, 130);
    			attr_dev(label, "class", "svelte-iw29za");
    			add_location(label, file$3, 4, 0, 65);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*$nsfwMode*/ ctx[0];
    			append_dev(label, t0);
    			append_dev(label, span);
    			if (remount) dispose();
    			dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[1]);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$nsfwMode*/ 1) {
    				input.checked = /*$nsfwMode*/ ctx[0];
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $nsfwMode;
    	validate_store(nsfwMode, "nsfwMode");
    	component_subscribe($$self, nsfwMode, $$value => $$invalidate(0, $nsfwMode = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NSFWcheck> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NSFWcheck", $$slots, []);

    	function input_change_handler() {
    		$nsfwMode = this.checked;
    		nsfwMode.set($nsfwMode);
    	}

    	$$self.$capture_state = () => ({ nsfwMode, $nsfwMode });
    	return [$nsfwMode, input_change_handler];
    }

    class NSFWcheck extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NSFWcheck",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.20.1 */
    const file$4 = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (94:3) {#each activeIpsum as paragraph}
    function create_each_block(ctx) {
    	let p;
    	let t_value = /*paragraph*/ ctx[7] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$4, 94, 4, 2287);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeIpsum*/ 1 && t_value !== (t_value = /*paragraph*/ ctx[7] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(94:3) {#each activeIpsum as paragraph}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let section0;
    	let t2;
    	let t3;
    	let t4;
    	let button0;
    	let t6;
    	let section1;
    	let button1;
    	let t8;
    	let div0;
    	let t9;
    	let footer;
    	let span0;
    	let t10;
    	let a0;
    	let t12;
    	let span1;
    	let t13;
    	let a1;
    	let t15;
    	let div1;
    	let a2;
    	let t17;
    	let span2;
    	let current;
    	let dispose;
    	const numparagraphsselect = new NumParagraphSelect({ $$inline: true });
    	const lengthselect = new LengthSelect({ $$inline: true });
    	const nsfwcheck = new NSFWcheck({ $$inline: true });
    	let each_value = /*activeIpsum*/ ctx[0];
    	validate_each_argument(each_value);
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
    			section0 = element("section");
    			create_component(numparagraphsselect.$$.fragment);
    			t2 = space();
    			create_component(lengthselect.$$.fragment);
    			t3 = space();
    			create_component(nsfwcheck.$$.fragment);
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "Make Ipsum";
    			t6 = space();
    			section1 = element("section");
    			button1 = element("button");
    			button1.textContent = "Copy Text";
    			t8 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			footer = element("footer");
    			span0 = element("span");
    			t10 = text("Created by ");
    			a0 = element("a");
    			a0.textContent = "Caitlin Haaf";
    			t12 = space();
    			span1 = element("span");
    			t13 = text("View code on ");
    			a1 = element("a");
    			a1.textContent = "Github";
    			t15 = space();
    			div1 = element("div");
    			a2 = element("a");
    			a2.textContent = "Tweet";
    			t17 = space();
    			span2 = element("span");
    			span2.textContent = "Share on Twitter";
    			add_location(h1, file$4, 70, 1, 1843);
    			attr_dev(section0, "class", "twoCol");
    			add_location(section0, file$4, 72, 1, 1872);
    			attr_dev(button0, "class", "svelte-n54h6d");
    			add_location(button0, file$4, 79, 1, 1976);
    			attr_dev(button1, "class", "copyBtn svelte-n54h6d");
    			add_location(button1, file$4, 87, 2, 2123);
    			attr_dev(div0, "id", "selection");
    			add_location(div0, file$4, 92, 2, 2224);
    			attr_dev(section1, "class", "ipsumContainer svelte-n54h6d");
    			toggle_class(section1, "active", /*activeIpsum*/ ctx[0].length >= 1);
    			add_location(section1, file$4, 83, 1, 2036);
    			attr_dev(a0, "href", "http://www.caitlinhaaf.com");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener noreferrer");
    			add_location(a0, file$4, 102, 19, 2402);
    			add_location(span0, file$4, 102, 2, 2385);
    			attr_dev(a1, "href", "https://github.com/caitlinhaaf/dragipsum");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener noreferrer");
    			add_location(a1, file$4, 103, 21, 2527);
    			add_location(span1, file$4, 103, 2, 2508);
    			attr_dev(a2, "class", "twitter-share-button");
    			attr_dev(a2, "href", "https://twitter.com/intent/tweet?text=Hello%20world");
    			attr_dev(a2, "data-size", "large");
    			add_location(a2, file$4, 105, 3, 2651);
    			add_location(span2, file$4, 108, 3, 2783);
    			add_location(div1, file$4, 104, 2, 2641);
    			add_location(footer, file$4, 101, 1, 2373);
    			attr_dev(main, "class", "svelte-n54h6d");
    			add_location(main, file$4, 69, 0, 1834);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, section0);
    			mount_component(numparagraphsselect, section0, null);
    			append_dev(section0, t2);
    			mount_component(lengthselect, section0, null);
    			append_dev(main, t3);
    			mount_component(nsfwcheck, main, null);
    			append_dev(main, t4);
    			append_dev(main, button0);
    			append_dev(main, t6);
    			append_dev(main, section1);
    			append_dev(section1, button1);
    			append_dev(section1, t8);
    			append_dev(section1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(main, t9);
    			append_dev(main, footer);
    			append_dev(footer, span0);
    			append_dev(span0, t10);
    			append_dev(span0, a0);
    			append_dev(footer, t12);
    			append_dev(footer, span1);
    			append_dev(span1, t13);
    			append_dev(span1, a1);
    			append_dev(footer, t15);
    			append_dev(footer, div1);
    			append_dev(div1, a2);
    			append_dev(div1, t17);
    			append_dev(div1, span2);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*getIpsum*/ ctx[1], false, false, false),
    				listen_dev(button1, "click", copyIpsum, false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*activeIpsum*/ 1) {
    				each_value = /*activeIpsum*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*activeIpsum*/ 1) {
    				toggle_class(section1, "active", /*activeIpsum*/ ctx[0].length >= 1);
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
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function copyIpsum() {
    	let ipsumContainer = document.querySelector("#selection");
    	var doc = window.document, selection, range;

    	if (window.getSelection && doc.createRange) {
    		selection = window.getSelection();
    		range = doc.createRange();
    		range.selectNodeContents(ipsumContainer);
    		selection.removeAllRanges();
    		selection.addRange(range);
    	} else if (doc.body.createTextRange) {
    		range = doc.body.createTextRange();
    		range.moveToElementText(ipsumContainer);
    		range.select();
    	}

    	document.execCommand("copy");
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let activeIpsum = [];
    	let numParagraphs_value, numSentence_value;

    	numSentences.subscribe(value => {
    		numSentence_value = value;
    	});

    	numParagraphs.subscribe(value => {
    		numParagraphs_value = value;
    	});

    	function getIpsum() {
    		let ipsum = [];
    		let i = 0;

    		while (i < numParagraphs_value) {
    			ipsum = [...ipsum, `${buildParagraph()}`];
    			i++;
    		}

    		$$invalidate(0, activeIpsum = ipsum);
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

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		safeWords,
    		nsfw,
    		numParagraphs,
    		numSentences,
    		nsfwMode,
    		LengthSelect,
    		NumParagraphsSelect: NumParagraphSelect,
    		NSFWcheck,
    		activeIpsum,
    		numParagraphs_value,
    		numSentence_value,
    		getIpsum,
    		copyIpsum,
    		buildParagraph,
    		buildSentence,
    		allPhrases
    	});

    	$$self.$inject_state = $$props => {
    		if ("activeIpsum" in $$props) $$invalidate(0, activeIpsum = $$props.activeIpsum);
    		if ("numParagraphs_value" in $$props) numParagraphs_value = $$props.numParagraphs_value;
    		if ("numSentence_value" in $$props) numSentence_value = $$props.numSentence_value;
    		if ("allPhrases" in $$props) allPhrases = $$props.allPhrases;
    	};

    	let allPhrases;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	 allPhrases = nsfwMode ? [...safeWords, ...nsfw] : [...safeWords];
    	return [activeIpsum, getIpsum];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
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
