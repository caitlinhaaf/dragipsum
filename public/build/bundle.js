
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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

    /* src/App.svelte generated by Svelte v3.14.1 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.paragraph = list[i];
    	return child_ctx;
    }

    // (93:2) {#each activeIpsum as paragraph}
    function create_each_block(ctx) {
    	let p;
    	let t_value = ctx.paragraph + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 93, 3, 2003);
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
    		source: "(93:2) {#each activeIpsum as paragraph}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let section;
    	let div1;
    	let h20;
    	let t3;
    	let div0;
    	let button0;
    	let t5;
    	let p0;
    	let t6;
    	let t7;
    	let button1;
    	let t9;
    	let div2;
    	let h21;
    	let t11;
    	let label0;
    	let input0;
    	let input0_value_value;
    	let t12;
    	let t13;
    	let label1;
    	let input1;
    	let input1_value_value;
    	let t14;
    	let t15;
    	let label2;
    	let input2;
    	let input2_value_value;
    	let t16;
    	let t17;
    	let label3;
    	let input3;
    	let t18;
    	let t19;
    	let button2;
    	let t21;
    	let p1;
    	let dispose;
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
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Number of Paragraphs";
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "<";
    			t5 = space();
    			p0 = element("p");
    			t6 = text(ctx.numParagraphs);
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = ">";
    			t9 = space();
    			div2 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Paragraph Length";
    			t11 = space();
    			label0 = element("label");
    			input0 = element("input");
    			t12 = text("\n\t\t\t\tShort");
    			t13 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t14 = text("\n\t\t\t\tMedium");
    			t15 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t16 = text("\n\t\t\t\tLong");
    			t17 = space();
    			label3 = element("label");
    			input3 = element("input");
    			t18 = text("\n\t\tAdd some Charisma, Uniqueness, Nerve, and Talent (NSFW)");
    			t19 = space();
    			button2 = element("button");
    			button2.textContent = "Make Ipsum";
    			t21 = space();
    			p1 = element("p");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-1fulx4m");
    			add_location(h1, file, 49, 1, 1086);
    			add_location(h20, file, 53, 3, 1149);
    			attr_dev(button0, "class", "svelte-1fulx4m");
    			add_location(button0, file, 55, 4, 1220);
    			attr_dev(p0, "class", "numParagraphs svelte-1fulx4m");
    			add_location(p0, file, 56, 4, 1284);
    			attr_dev(button1, "class", "svelte-1fulx4m");
    			add_location(button1, file, 57, 4, 1333);
    			attr_dev(div0, "class", "numParagraphsSelect svelte-1fulx4m");
    			add_location(div0, file, 54, 3, 1182);
    			attr_dev(div1, "class", "svelte-1fulx4m");
    			add_location(div1, file, 52, 2, 1140);
    			add_location(h21, file, 63, 3, 1426);
    			attr_dev(input0, "type", "radio");
    			input0.__value = input0_value_value = 4;
    			input0.value = input0.__value;
    			ctx.$$binding_groups[0].push(input0);
    			add_location(input0, file, 65, 4, 1467);
    			add_location(label0, file, 64, 3, 1455);
    			attr_dev(input1, "type", "radio");
    			input1.__value = input1_value_value = 8;
    			input1.value = input1.__value;
    			ctx.$$binding_groups[0].push(input1);
    			add_location(input1, file, 70, 4, 1560);
    			add_location(label1, file, 69, 3, 1548);
    			attr_dev(input2, "type", "radio");
    			input2.__value = input2_value_value = 16;
    			input2.value = input2.__value;
    			ctx.$$binding_groups[0].push(input2);
    			add_location(input2, file, 75, 4, 1654);
    			add_location(label2, file, 74, 3, 1642);
    			attr_dev(div2, "class", "svelte-1fulx4m");
    			add_location(div2, file, 62, 2, 1417);
    			attr_dev(section, "class", "twoCol svelte-1fulx4m");
    			add_location(section, file, 51, 1, 1113);
    			attr_dev(input3, "type", "checkbox");
    			add_location(input3, file, 82, 2, 1764);
    			add_location(label3, file, 81, 1, 1754);
    			add_location(button2, file, 86, 1, 1880);
    			add_location(p1, file, 90, 1, 1936);
    			attr_dev(main, "class", "svelte-1fulx4m");
    			add_location(main, file, 48, 0, 1078);

    			dispose = [
    				listen_dev(button0, "click", ctx.incrementNumParagraphs(-1), false, false, false),
    				listen_dev(button1, "click", ctx.incrementNumParagraphs(1), false, false, false),
    				listen_dev(input0, "change", ctx.input0_change_handler),
    				listen_dev(input1, "change", ctx.input1_change_handler),
    				listen_dev(input2, "change", ctx.input2_change_handler),
    				listen_dev(input3, "change", ctx.input3_change_handler),
    				listen_dev(button2, "click", ctx.getIpsum, false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, section);
    			append_dev(section, div1);
    			append_dev(div1, h20);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t5);
    			append_dev(div0, p0);
    			append_dev(p0, t6);
    			append_dev(div0, t7);
    			append_dev(div0, button1);
    			append_dev(section, t9);
    			append_dev(section, div2);
    			append_dev(div2, h21);
    			append_dev(div2, t11);
    			append_dev(div2, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === ctx.numSentences;
    			append_dev(label0, t12);
    			append_dev(div2, t13);
    			append_dev(div2, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === ctx.numSentences;
    			append_dev(label1, t14);
    			append_dev(div2, t15);
    			append_dev(div2, label2);
    			append_dev(label2, input2);
    			input2.checked = input2.__value === ctx.numSentences;
    			append_dev(label2, t16);
    			append_dev(main, t17);
    			append_dev(main, label3);
    			append_dev(label3, input3);
    			input3.checked = ctx.nsfwMode;
    			append_dev(label3, t18);
    			append_dev(main, t19);
    			append_dev(main, button2);
    			append_dev(main, t21);
    			append_dev(main, p1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(p1, null);
    			}
    		},
    		p: function update(changed, ctx) {
    			if (changed.numParagraphs) set_data_dev(t6, ctx.numParagraphs);

    			if (changed.numSentences) {
    				input0.checked = input0.__value === ctx.numSentences;
    			}

    			if (changed.numSentences) {
    				input1.checked = input1.__value === ctx.numSentences;
    			}

    			if (changed.numSentences) {
    				input2.checked = input2.__value === ctx.numSentences;
    			}

    			if (changed.nsfwMode) {
    				input3.checked = ctx.nsfwMode;
    			}

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
    						each_blocks[i].m(p1, null);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input0), 1);
    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input1), 1);
    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input2), 1);
    			destroy_each(each_blocks, detaching);
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
    	let activeIpsum = [];
    	let nsfwMode = false;
    	let numSentences = 4;
    	let numParagraphs = 1;

    	const incrementNumParagraphs = num => () => {
    		if (numParagraphs == 1 && num == -1 || numParagraphs == 5 && num == 1) return;
    		$$invalidate("numParagraphs", numParagraphs += num);
    	};

    	function getIpsum() {
    		let ipsum = [];
    		let i = 0;

    		while (i < numParagraphs) {
    			ipsum = [...ipsum, `${buildParagraph()}`];
    			i++;
    		}

    		$$invalidate("activeIpsum", activeIpsum = ipsum);
    	}

    	function buildParagraph() {
    		let paragraph = ``;
    		let i = 0;

    		while (i < numSentences) {
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

    	const $$binding_groups = [[]];

    	function input0_change_handler() {
    		numSentences = this.__value;
    		$$invalidate("numSentences", numSentences);
    	}

    	function input1_change_handler() {
    		numSentences = this.__value;
    		$$invalidate("numSentences", numSentences);
    	}

    	function input2_change_handler() {
    		numSentences = this.__value;
    		$$invalidate("numSentences", numSentences);
    	}

    	function input3_change_handler() {
    		nsfwMode = this.checked;
    		$$invalidate("nsfwMode", nsfwMode);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("activeIpsum" in $$props) $$invalidate("activeIpsum", activeIpsum = $$props.activeIpsum);
    		if ("nsfwMode" in $$props) $$invalidate("nsfwMode", nsfwMode = $$props.nsfwMode);
    		if ("numSentences" in $$props) $$invalidate("numSentences", numSentences = $$props.numSentences);
    		if ("numParagraphs" in $$props) $$invalidate("numParagraphs", numParagraphs = $$props.numParagraphs);
    		if ("allPhrases" in $$props) allPhrases = $$props.allPhrases;
    	};

    	let allPhrases;

    	$$self.$$.update = (changed = { nsfwMode: 1 }) => {
    		if (changed.nsfwMode) {
    			 allPhrases = nsfwMode ? [...safeWords, ...nsfw] : [...safeWords];
    		}
    	};

    	return {
    		activeIpsum,
    		nsfwMode,
    		numSentences,
    		numParagraphs,
    		incrementNumParagraphs,
    		getIpsum,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		$$binding_groups
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
