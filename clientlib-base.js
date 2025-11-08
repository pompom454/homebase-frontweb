/*******************************************************************************
 * Copyright 2018 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/

/**
 * Element.matches()
 * https://developer.mozilla.org/enUS/docs/Web/API/Element/matches#Polyfill
 */
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Element.closest()
 * https://developer.mozilla.org/enUS/docs/Web/API/Element/closest#Polyfill
 */
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        "use strict";
        var el = this;
        if (!document.documentElement.contains(el)) {
            return null;
        }
        do {
            if (el.matches(s)) {
                return el;
            }
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

/*******************************************************************************
 * Copyright 2018 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/
(function() {
    "use strict";

    var NS = "cmp";
    var IS = "tabs";

    var keyCodes = {
        END: 35,
        HOME: 36,
        ARROW_LEFT: 37,
        ARROW_UP: 38,
        ARROW_RIGHT: 39,
        ARROW_DOWN: 40
    };

    var selectors = {
        self: "[data-" +  NS + '-is="' + IS + '"]',
        active: {
            tab: "cmp-tabs__tab--active",
            tabpanel: "cmp-tabs__tabpanel--active"
        }
    };

    /**
     * Tabs Configuration
     *
     * @typedef {Object} TabsConfig Represents a Tabs configuration
     * @property {HTMLElement} element The HTMLElement representing the Tabs
     * @property {Object} options The Tabs options
     */

    /**
     * Tabs
     *
     * @class Tabs
     * @classdesc An interactive Tabs component for navigating a list of tabs
     * @param {TabsConfig} config The Tabs configuration
     */
    function Tabs(config) {
        var that = this;

        if (config && config.element) {
            init(config);
        }

        /**
         * Initializes the Tabs
         *
         * @private
         * @param {TabsConfig} config The Tabs configuration
         */
        function init(config) {
            // prevents multiple initialization
            config.element.removeAttribute("data-" + NS + "-is");

            cacheElements(config.element);
            that._active = getActiveIndex(that._elements["tab"]);

            if (that._elements.tabpanel) {
                refreshActive();
                bindEvents();
            }

            if (window.Granite && window.Granite.author && window.Granite.author.MessageChannel) {
                /*
                 * Editor message handling:
                 * - subscribe to "cmp.panelcontainer" message requests sent by the editor frame
                 * - check that the message data panel container type is correct and that the id (path) matches this specific Tabs component
                 * - if so, route the "navigate" operation to enact a navigation of the Tabs based on index data
                 */
                new window.Granite.author.MessageChannel("cqauthor", window).subscribeRequestMessage("cmp.panelcontainer", function(message) {
                    if (message.data && message.data.type === "cmp-tabs" && message.data.id === that._elements.self.dataset["cmpPanelcontainerId"]) {
                        if (message.data.operation === "navigate") {
                            navigate(message.data.index);
                        }
                    }
                });
            }
        }

        /**
         * Returns the index of the active tab, if no tab is active returns 0
         *
         * @param {Array} tabs Tab elements
         * @returns {Number} Index of the active tab, 0 if none is active
         */
        function getActiveIndex(tabs) {
            if (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].classList.contains(selectors.active.tab)) {
                        return i;
                    }
                }
            }
            return 0;
        }

        /**
         * Caches the Tabs elements as defined via the {@code data-tabs-hook="ELEMENT_NAME"} markup API
         *
         * @private
         * @param {HTMLElement} wrapper The Tabs wrapper element
         */
        function cacheElements(wrapper) {
            that._elements = {};
            that._elements.self = wrapper;
            var hooks = that._elements.self.querySelectorAll("[data-" + NS + "-hook-" + IS + "]");

            for (var i = 0; i < hooks.length; i++) {
                var hook = hooks[i];
                if (hook.closest("." + NS + "-" + IS) === that._elements.self) { // only process own tab elements
                    var capitalized = IS;
                    capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
                    var key = hook.dataset[NS + "Hook" + capitalized];
                    if (that._elements[key]) {
                        if (!Array.isArray(that._elements[key])) {
                            var tmp = that._elements[key];
                            that._elements[key] = [tmp];
                        }
                        that._elements[key].push(hook);
                    } else {
                        that._elements[key] = hook;
                    }
                }
            }
        }

        /**
         * Binds Tabs event handling
         *
         * @private
         */
        function bindEvents() {
            var tabs = that._elements["tab"];
            if (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    (function(index) {
                        tabs[i].addEventListener("click", function(event) {
                            navigateAndFocusTab(index);
                        });
                        tabs[i].addEventListener("keydown", function(event) {
                            onKeyDown(event);
                        });
                    })(i);
                }
            }
        }

        /**
         * Handles tab keydown events
         *
         * @private
         * @param {Object} event The keydown event
         */
        function onKeyDown(event) {
            var index = that._active;
            var lastIndex = that._elements["tab"].length - 1;

            switch (event.keyCode) {
                case keyCodes.ARROW_LEFT:
                case keyCodes.ARROW_UP:
                    event.preventDefault();
                    if (index > 0) {
                        navigateAndFocusTab(index - 1);
                    }
                    break;
                case keyCodes.ARROW_RIGHT:
                case keyCodes.ARROW_DOWN:
                    event.preventDefault();
                    if (index < lastIndex) {
                        navigateAndFocusTab(index + 1);
                    }
                    break;
                case keyCodes.HOME:
                    event.preventDefault();
                    navigateAndFocusTab(0);
                    break;
                case keyCodes.END:
                    event.preventDefault();
                    navigateAndFocusTab(lastIndex);
                    break;
                default:
                    return;
            }
        }

        /**
         * Refreshes the tab markup based on the current {@code Tabs#_active} index
         *
         * @private
         */
        function refreshActive() {
            var tabpanels = that._elements["tabpanel"];
            var tabs = that._elements["tab"];

            if (tabpanels) {
                if (Array.isArray(tabpanels)) {
                    for (var i = 0; i < tabpanels.length; i++) {
                        if (i === parseInt(that._active)) {
                            tabpanels[i].classList.add(selectors.active.tabpanel);
                            tabpanels[i].removeAttribute("aria-hidden");
                            tabs[i].classList.add(selectors.active.tab);
                            tabs[i].setAttribute("aria-selected", true);
                            tabs[i].setAttribute("tabindex", "0");
                        } else {
                            tabpanels[i].classList.remove(selectors.active.tabpanel);
                            tabpanels[i].setAttribute("aria-hidden", true);
                            tabs[i].classList.remove(selectors.active.tab);
                            tabs[i].setAttribute("aria-selected", false);
                            tabs[i].setAttribute("tabindex", "-1");
                        }
                    }
                } else {
                    // only one tab
                    tabpanels.classList.add(selectors.active.tabpanel);
                    tabs.classList.add(selectors.active.tab);
                }
            }
        }

        /**
         * Focuses the element and prevents scrolling the element into view
         *
         * @param {HTMLElement} element Element to focus
         */
        function focusWithoutScroll(element) {
            var x = window.scrollX || window.pageXOffset;
            var y = window.scrollY || window.pageYOffset;
            element.focus();
            window.scrollTo(x, y);
        }

        /**
         * Navigates to the tab at the provided index
         *
         * @private
         * @param {Number} index The index of the tab to navigate to
         */
        function navigate(index) {
            that._active = index;
            refreshActive();
        }

        /**
         * Navigates to the item at the provided index and ensures the active tab gains focus
         *
         * @private
         * @param {Number} index The index of the item to navigate to
         */
        function navigateAndFocusTab(index) {
            navigate(index);
            focusWithoutScroll(that._elements["tab"][index]);
        }
    }

    /**
     * Reads options data from the Tabs wrapper element, defined via {@code data-cmp-*} data attributes
     *
     * @private
     * @param {HTMLElement} element The Tabs element to read options data from
     * @returns {Object} The options read from the component data attributes
     */
    function readData(element) {
        var data = element.dataset;
        var options = [];
        var capitalized = IS;
        capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
        var reserved = ["is", "hook" + capitalized];

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];

                if (key.indexOf(NS) === 0) {
                    key = key.slice(NS.length);
                    key = key.charAt(0).toLowerCase() + key.substring(1);

                    if (reserved.indexOf(key) === -1) {
                        options[key] = value;
                    }
                }
            }
        }

        return options;
    }

    /**
     * Document ready handler and DOM mutation observers. Initializes Tabs components as necessary.
     *
     * @private
     */
    function onDocumentReady() {
        var elements = document.querySelectorAll(selectors.self);
        for (var i = 0; i < elements.length; i++) {
            new Tabs({ element: elements[i], options: readData(elements[i]) });
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var body = document.querySelector("body");
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // needed for IE
                var nodesArray = [].slice.call(mutation.addedNodes);
                if (nodesArray.length > 0) {
                    nodesArray.forEach(function(addedNode) {
                        if (addedNode.querySelectorAll) {
                            var elementsArray = [].slice.call(addedNode.querySelectorAll(selectors.self));
                            elementsArray.forEach(function(element) {
                                new Tabs({ element: element, options: readData(element) });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(body, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    if (document.readyState !== "loading") {
        onDocumentReady();
    } else {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
    }

}());

/*******************************************************************************
 * Copyright 2018 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/
(function() {
    "use strict";

    var NS = "cmp";
    var IS = "carousel";

    var keyCodes = {
        SPACE: 32,
        END: 35,
        HOME: 36,
        ARROW_LEFT: 37,
        ARROW_UP: 38,
        ARROW_RIGHT: 39,
        ARROW_DOWN: 40
    };

    var selectors = {
        self: "[data-" +  NS + '-is="' + IS + '"]'
    };

    var properties = {
        /**
         * Determines whether the Carousel will automatically transition between slides
         *
         * @memberof Carousel
         * @type {Boolean}
         * @default false
         */
        "autoplay": {
            "default": false,
            "transform": function(value) {
                return !(value === null || typeof value === "undefined");
            }
        },
        /**
         * Duration (in milliseconds) before automatically transitioning to the next slide
         *
         * @memberof Carousel
         * @type {Number}
         * @default 5000
         */
        "delay": {
            "default": 5000,
            "transform": function(value) {
                value = parseFloat(value);
                return !isNaN(value) ? value : null;
            }
        },
        /**
         * Determines whether automatic pause on hovering the carousel is disabled
         *
         * @memberof Carousel
         * @type {Boolean}
         * @default false
         */
        "autopauseDisabled": {
            "default": false,
            "transform": function(value) {
                return !(value === null || typeof value === "undefined");
            }
        }
    };

    /**
     * Carousel Configuration
     *
     * @typedef {Object} CarouselConfig Represents a Carousel configuration
     * @property {HTMLElement} element The HTMLElement representing the Carousel
     * @property {Object} options The Carousel options
     */

    /**
     * Carousel
     *
     * @class Carousel
     * @classdesc An interactive Carousel component for navigating a list of generic items
     * @param {CarouselConfig} config The Carousel configuration
     */
    function Carousel(config) {
        var that = this;

        if (config && config.element) {
            init(config);
        }

        /**
         * Initializes the Carousel
         *
         * @private
         * @param {CarouselConfig} config The Carousel configuration
         */
        function init(config) {
            // prevents multiple initialization
            config.element.removeAttribute("data-" + NS + "-is");

            setupProperties(config.options);
            cacheElements(config.element);

            that._active = 0;
            that._paused = false;

            if (that._elements.item) {
                refreshActive();
                bindEvents();
                resetAutoplayInterval();
                refreshPlayPauseActions();
            }

            if (window.Granite && window.Granite.author && window.Granite.author.MessageChannel) {
                /*
                 * Editor message handling:
                 * - subscribe to "cmp.panelcontainer" message requests sent by the editor frame
                 * - check that the message data panel container type is correct and that the id (path) matches this specific Carousel component
                 * - if so, route the "navigate" operation to enact a navigation of the Carousel based on index data
                 */
                new window.Granite.author.MessageChannel("cqauthor", window).subscribeRequestMessage("cmp.panelcontainer", function(message) {
                    if (message.data && message.data.type === "cmp-carousel" && message.data.id === that._elements.self.dataset["cmpPanelcontainerId"]) {
                        if (message.data.operation === "navigate") {
                            navigate(message.data.index);
                        }
                    }
                });
            }
        }

        /**
         * Caches the Carousel elements as defined via the {@code data-carousel-hook="ELEMENT_NAME"} markup API
         *
         * @private
         * @param {HTMLElement} wrapper The Carousel wrapper element
         */
        function cacheElements(wrapper) {
            that._elements = {};
            that._elements.self = wrapper;
            var hooks = that._elements.self.querySelectorAll("[data-" + NS + "-hook-" + IS + "]");

            for (var i = 0; i < hooks.length; i++) {
                var hook = hooks[i];
                var capitalized = IS;
                capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
                var key = hook.dataset[NS + "Hook" + capitalized];
                if (that._elements[key]) {
                    if (!Array.isArray(that._elements[key])) {
                        var tmp = that._elements[key];
                        that._elements[key] = [tmp];
                    }
                    that._elements[key].push(hook);
                } else {
                    that._elements[key] = hook;
                }
            }
        }

        /**
         * Sets up properties for the Carousel based on the passed options.
         *
         * @private
         * @param {Object} options The Carousel options
         */
        function setupProperties(options) {
            that._properties = {};

            for (var key in properties) {
                if (properties.hasOwnProperty(key)) {
                    var property = properties[key];
                    var value = null;

                    if (options && options[key] != null) {
                        value = options[key];

                        // transform the provided option
                        if (property && typeof property.transform === "function") {
                            value = property.transform(value);
                        }
                    }

                    if (value === null) {
                        // value still null, take the property default
                        value = properties[key]["default"];
                    }

                    that._properties[key] = value;
                }
            }
        }

        /**
         * Binds Carousel event handling
         *
         * @private
         */
        function bindEvents() {
            if (that._elements["previous"]) {
                that._elements["previous"].addEventListener("click", function() {
                    navigate(getPreviousIndex());
                });
            }

            if (that._elements["next"]) {
                that._elements["next"].addEventListener("click", function() {
                    navigate(getNextIndex());
                });
            }

            var indicators = that._elements["indicator"];
            if (indicators) {
                for (var i = 0; i < indicators.length; i++) {
                    (function(index) {
                        indicators[i].addEventListener("click", function(event) {
                            navigateAndFocusIndicator(index);
                        });
                    })(i);
                }
            }

            if (that._elements["pause"]) {
                if (that._properties.autoplay) {
                    that._elements["pause"].addEventListener("click", onPauseClick);
                }
            }

            if (that._elements["play"]) {
                if (that._properties.autoplay) {
                    that._elements["play"].addEventListener("click", onPlayClick);
                }
            }

            that._elements.self.addEventListener("keydown", onKeyDown);

            if (!that._properties.autopauseDisabled) {
                that._elements.self.addEventListener("mouseenter", onMouseEnter);
                that._elements.self.addEventListener("mouseleave", onMouseLeave);
            }
        }

        /**
         * Handles carousel keydown events
         *
         * @private
         * @param {Object} event The keydown event
         */
        function onKeyDown(event) {
            var index = that._active;
            var lastIndex = that._elements["indicator"].length - 1;

            switch (event.keyCode) {
                case keyCodes.ARROW_LEFT:
                case keyCodes.ARROW_UP:
                    event.preventDefault();
                    if (index > 0) {
                        navigateAndFocusIndicator(index - 1);
                    }
                    break;
                case keyCodes.ARROW_RIGHT:
                case keyCodes.ARROW_DOWN:
                    event.preventDefault();
                    if (index < lastIndex) {
                        navigateAndFocusIndicator(index + 1);
                    }
                    break;
                case keyCodes.HOME:
                    event.preventDefault();
                    navigateAndFocusIndicator(0);
                    break;
                case keyCodes.END:
                    event.preventDefault();
                    navigateAndFocusIndicator(lastIndex);
                    break;
                case keyCodes.SPACE:
                    if (that._properties.autoplay && (event.target !== that._elements["previous"] && event.target !== that._elements["next"])) {
                        event.preventDefault();
                        if (!that._paused) {
                            pause();
                        } else {
                            play();
                        }
                    }
                    if (event.target === that._elements["pause"]) {
                        that._elements["play"].focus();
                    }
                    if (event.target === that._elements["play"]) {
                        that._elements["pause"].focus();
                    }
                    break;
                default:
                    return;
            }
        }

        /**
         * Handles carousel mouseenter events
         *
         * @private
         * @param {Object} event The mouseenter event
         */
        function onMouseEnter(event) {
            clearAutoplayInterval();
        }

        /**
         * Handles carousel mouseleave events
         *
         * @private
         * @param {Object} event The mouseleave event
         */
        function onMouseLeave(event) {
            resetAutoplayInterval();
        }

        /**
         * Handles pause element click events
         *
         * @private
         * @param {Object} event The click event
         */
        function onPauseClick(event) {
            pause();
            that._elements["play"].focus();
        }

        /**
         * Handles play element click events
         *
         * @private
         * @param {Object} event The click event
         */
        function onPlayClick() {
            play();
            that._elements["pause"].focus();
        }

        /**
         * Pauses the playing of the Carousel. Sets {@code Carousel#_paused} marker.
         * Only relevant when autoplay is enabled
         *
         * @private
         */
        function pause() {
            that._paused = true;
            clearAutoplayInterval();
            refreshPlayPauseActions();
        }

        /**
         * Enables the playing of the Carousel. Sets {@code Carousel#_paused} marker.
         * Only relevant when autoplay is enabled
         *
         * @private
         */
        function play() {
            that._paused = false;

            // If the Carousel is hovered, don't begin auto transitioning until the next mouse leave event
            var hovered = false;
            if (that._elements.self.parentElement) {
                hovered = that._elements.self.parentElement.querySelector(":hover") === that._elements.self;
            }
            if (that._properties.autopauseDisabled || !hovered) {
                resetAutoplayInterval();
            }

            refreshPlayPauseActions();
        }

        /**
         * Refreshes the play/pause action markup based on the {@code Carousel#_paused} state
         *
         * @private
         */
        function refreshPlayPauseActions() {
            setActionDisabled(that._elements["pause"], that._paused);
            setActionDisabled(that._elements["play"], !that._paused);
        }

        /**
         * Refreshes the item markup based on the current {@code Carousel#_active} index
         *
         * @private
         */
        function refreshActive() {
            var items = that._elements["item"];
            var indicators = that._elements["indicator"];

            if (items) {
                if (Array.isArray(items)) {
                    for (var i = 0; i < items.length; i++) {
                        if (i === parseInt(that._active)) {
                            items[i].classList.add("cmp-carousel__item--active");
                            items[i].removeAttribute("aria-hidden");
                            indicators[i].classList.add("cmp-carousel__indicator--active");
                            indicators[i].setAttribute("aria-selected", true);
                            indicators[i].setAttribute("tabindex", "0");
                        } else {
                            items[i].classList.remove("cmp-carousel__item--active");
                            items[i].setAttribute("aria-hidden", true);
                            indicators[i].classList.remove("cmp-carousel__indicator--active");
                            indicators[i].setAttribute("aria-selected", false);
                            indicators[i].setAttribute("tabindex", "-1");
                        }
                    }
                } else {
                    // only one item
                    items.classList.add("cmp-carousel__item--active");
                    indicators.classList.add("cmp-carousel__indicator--active");
                }
            }
        }

        /**
         * Focuses the element and prevents scrolling the element into view
         *
         * @param {HTMLElement} element Element to focus
         */
        function focusWithoutScroll(element) {
            var x = window.scrollX || window.pageXOffset;
            var y = window.scrollY || window.pageYOffset;
            element.focus();
            window.scrollTo(x, y);
        }

        /**
         * Retrieves the next active index, with looping
         *
         * @private
         * @returns {Number} Index of the next carousel item
         */
        function getNextIndex() {
            return that._active === (that._elements["item"].length - 1) ? 0 : that._active + 1;
        }

        /**
         * Retrieves the previous active index, with looping
         *
         * @private
         * @returns {Number} Index of the previous carousel item
         */
        function getPreviousIndex() {
            return that._active === 0 ? (that._elements["item"].length - 1) : that._active - 1;
        }

        /**
         * Navigates to the item at the provided index
         *
         * @private
         * @param {Number} index The index of the item to navigate to
         */
        function navigate(index) {
            if (index < 0 || index > (that._elements["item"].length - 1)) {
                return;
            }

            that._active = index;
            refreshActive();

            // reset the autoplay transition interval following navigation, if not already hovering the carousel
            if (that._elements.self.parentElement) {
                if (that._elements.self.parentElement.querySelector(":hover") !== that._elements.self) {
                    resetAutoplayInterval();
                }
            }
        }

        /**
         * Navigates to the item at the provided index and ensures the active indicator gains focus
         *
         * @private
         * @param {Number} index The index of the item to navigate to
         */
        function navigateAndFocusIndicator(index) {
            navigate(index);
            focusWithoutScroll(that._elements["indicator"][index]);
        }

        /**
         * Starts/resets automatic slide transition interval
         *
         * @private
         */
        function resetAutoplayInterval() {
            if (that._paused || !that._properties.autoplay) {
                return;
            }
            clearAutoplayInterval();
            that._autoplayIntervalId = window.setInterval(function() {
                if (document.visibilityState && document.hidden) {
                    return;
                }
                var indicators = that._elements["indicators"];
                if (indicators !== document.activeElement && indicators.contains(document.activeElement)) {
                    // if an indicator has focus, ensure we switch focus following navigation
                    navigateAndFocusIndicator(getNextIndex());
                } else {
                    navigate(getNextIndex());
                }
            }, that._properties.delay);
        }

        /**
         * Clears/pauses automatic slide transition interval
         *
         * @private
         */
        function clearAutoplayInterval() {
            window.clearInterval(that._autoplayIntervalId);
            that._autoplayIntervalId = null;
        }

        /**
         * Sets the disabled state for an action and toggles the appropriate CSS classes
         *
         * @private
         * @param {HTMLElement} action Action to disable
         * @param {Boolean} [disable] {@code true} to disable, {@code false} to enable
         */
        function setActionDisabled(action, disable) {
            if (!action) {
                return;
            }
            if (disable !== false) {
                action.disabled = true;
                action.classList.add("cmp-carousel__action--disabled");
            } else {
                action.disabled = false;
                action.classList.remove("cmp-carousel__action--disabled");
            }
        }
    }

    /**
     * Reads options data from the Carousel wrapper element, defined via {@code data-cmp-*} data attributes
     *
     * @private
     * @param {HTMLElement} element The Carousel element to read options data from
     * @returns {Object} The options read from the component data attributes
     */
    function readData(element) {
        var data = element.dataset;
        var options = [];
        var capitalized = IS;
        capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
        var reserved = ["is", "hook" + capitalized];

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];

                if (key.indexOf(NS) === 0) {
                    key = key.slice(NS.length);
                    key = key.charAt(0).toLowerCase() + key.substring(1);

                    if (reserved.indexOf(key) === -1) {
                        options[key] = value;
                    }
                }
            }
        }

        return options;
    }

    /**
     * Document ready handler and DOM mutation observers. Initializes Carousel components as necessary.
     *
     * @private
     */
    function onDocumentReady() {
        var elements = document.querySelectorAll(selectors.self);
        for (var i = 0; i < elements.length; i++) {
            new Carousel({ element: elements[i], options: readData(elements[i]) });
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var body             = document.querySelector("body");
        var observer         = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // needed for IE
                var nodesArray = [].slice.call(mutation.addedNodes);
                if (nodesArray.length > 0) {
                    nodesArray.forEach(function(addedNode) {
                        if (addedNode.querySelectorAll) {
                            var elementsArray = [].slice.call(addedNode.querySelectorAll(selectors.self));
                            elementsArray.forEach(function(element) {
                                new Carousel({ element: element, options: readData(element) });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(body, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    if (document.readyState !== "loading") {
        onDocumentReady();
    } else {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
    }

}());

/*******************************************************************************
 * Copyright 2017 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/
if (window.Element && !Element.prototype.closest) {
    // eslint valid-jsdoc: "off"
    Element.prototype.closest =
        function(s) {
            "use strict";
            var matches = (this.document || this.ownerDocument).querySelectorAll(s);
            var el      = this;
            var i;
            do {
                i = matches.length;
                while (--i >= 0 && matches.item(i) !== el) {
                    // continue
                }
            } while ((i < 0) && (el = el.parentElement));
            return el;
        };
}

if (window.Element && !Element.prototype.matches) {
    Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            "use strict";
            var matches = (this.document || this.ownerDocument).querySelectorAll(s);
            var i       = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {
                // continue
            }
            return i > -1;
        };
}

if (!Object.assign) {
    Object.assign = function(target, varArgs) { // .length of function is 2
        "use strict";
        if (target === null) {
            throw new TypeError("Cannot convert undefined or null to object");
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];

            if (nextSource !== null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

(function(arr) {
    "use strict";
    arr.forEach(function(item) {
        if (item.hasOwnProperty("remove")) {
            return;
        }
        Object.defineProperty(item, "remove", {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function remove() {
                this.parentNode.removeChild(this);
            }
        });
    });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

/*******************************************************************************
 * Copyright 2016 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/
(function() {
    "use strict";

    var NS = "cmp";
    var IS = "image";

    var EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    var LAZY_THRESHOLD = 0;
    var SRC_URI_TEMPLATE_WIDTH_VAR = "{.width}";

    var selectors = {
        self: "[data-" + NS + '-is="' + IS + '"]',
        image: '[data-cmp-hook-image="image"]',
        map: '[data-cmp-hook-image="map"]',
        area: '[data-cmp-hook-image="area"]'
    };

    var lazyLoader = {
        "cssClass": "cmp-image__image--is-loading",
        "style": {
            "height": 0,
            "padding-bottom": "" // will be replaced with % ratio
        }
    };

    var properties = {
        /**
         * An array of alternative image widths (in pixels).
         * Used to replace a {.width} variable in the src property with an optimal width if a URI template is provided.
         *
         * @memberof Image
         * @type {Number[]}
         * @default []
         */
        "widths": {
            "default": [],
            "transform": function(value) {
                var widths = [];
                value.split(",").forEach(function(item) {
                    item = parseFloat(item);
                    if (!isNaN(item)) {
                        widths.push(item);
                    }
                });
                return widths;
            }
        },
        /**
         * Indicates whether the image should be rendered lazily.
         *
         * @memberof Image
         * @type {Boolean}
         * @default false
         */
        "lazy": {
            "default": false,
            "transform": function(value) {
                return !(value === null || typeof value === "undefined");
            }
        },
        /**
         * The image source.
         *
         * Can be a simple image source, or a URI template representation that
         * can be variable expanded - useful for building an image configuration with an alternative width.
         * e.g. '/path/image.coreimg{.width}.jpeg/1506620954214.jpeg'
         *
         * @memberof Image
         * @type {String}
         */
        "src": {
        }
    };

    var devicePixelRatio = window.devicePixelRatio || 1;

    function readData(element) {
        var data = element.dataset;
        var options = [];
        var capitalized = IS;
        capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
        var reserved = ["is", "hook" + capitalized];

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];

                if (key.indexOf(NS) === 0) {
                    key = key.slice(NS.length);
                    key = key.charAt(0).toLowerCase() + key.substring(1);

                    if (reserved.indexOf(key) === -1) {
                        options[key] = value;
                    }
                }
            }
        }

        return options;
    }

    function Image(config) {
        var that = this;

        function init(config) {
            // prevents multiple initialization
            config.element.removeAttribute("data-" + NS + "-is");

            setupProperties(config.options);
            cacheElements(config.element);

            if (!that._elements.noscript) {
                return;
            }

            that._elements.container = that._elements.link ? that._elements.link : that._elements.self;

            unwrapNoScript();

            if (that._properties.lazy) {
                addLazyLoader();
            }

            if (that._elements.map) {
                that._elements.image.addEventListener("load", onLoad);
            }

            window.addEventListener("scroll", that.update);
            window.addEventListener("resize", onWindowResize);
            window.addEventListener("update", that.update);
            that._elements.image.addEventListener("cmp-image-redraw", that.update);
            that.update();
        }

        function loadImage() {
            var hasWidths = that._properties.widths && that._properties.widths.length > 0;
            var replacement = hasWidths ? "." + getOptimalWidth() : "";
            var url = that._properties.src.replace(SRC_URI_TEMPLATE_WIDTH_VAR, replacement);

            if (that._elements.image.getAttribute("src") !== url) {
                that._elements.image.setAttribute("src", url);
                if (!hasWidths) {
                    window.removeEventListener("scroll", that.update);
                }
            }

            if (that._lazyLoaderShowing) {
                that._elements.image.addEventListener("load", removeLazyLoader);
            }
        }

        function getOptimalWidth() {
            var container = that._elements.self;
            var containerWidth = container.clientWidth;
            while (containerWidth === 0 && container.parentNode) {
                container = container.parentNode;
                containerWidth = container.clientWidth;
            }
            var optimalWidth = containerWidth * devicePixelRatio;
            var len = that._properties.widths.length;
            var key = 0;

            while ((key < len - 1) && (that._properties.widths[key] < optimalWidth)) {
                key++;
            }

            return that._properties.widths[key].toString();
        }

        function addLazyLoader() {
            var width = that._elements.image.getAttribute("width");
            var height = that._elements.image.getAttribute("height");

            if (width && height) {
                var ratio = (height / width) * 100;
                var styles = lazyLoader.style;

                styles["padding-bottom"] = ratio + "%";

                for (var s in styles) {
                    if (styles.hasOwnProperty(s)) {
                        that._elements.image.style[s] = styles[s];
                    }
                }
            }
            that._elements.image.setAttribute("src", EMPTY_PIXEL);
            that._elements.image.classList.add(lazyLoader.cssClass);
            that._lazyLoaderShowing = true;
        }

        function unwrapNoScript() {
            var markup = decodeNoscript(that._elements.noscript.textContent.trim());
            var parser = new DOMParser();

            // temporary document avoids requesting the image before removing its src
            var temporaryDocument = parser.parseFromString(markup, "text/html");
            var imageElement = temporaryDocument.querySelector(selectors.image);
            imageElement.removeAttribute("src");
            that._elements.container.insertBefore(imageElement, that._elements.noscript);

            var mapElement = temporaryDocument.querySelector(selectors.map);
            if (mapElement) {
                that._elements.container.insertBefore(mapElement, that._elements.noscript);
            }

            that._elements.noscript.parentNode.removeChild(that._elements.noscript);
            if (that._elements.container.matches(selectors.image)) {
                that._elements.image = that._elements.container;
            } else {
                that._elements.image = that._elements.container.querySelector(selectors.image);
            }

            that._elements.map = that._elements.container.querySelector(selectors.map);
            that._elements.areas = that._elements.container.querySelectorAll(selectors.area);
        }

        function removeLazyLoader() {
            that._elements.image.classList.remove(lazyLoader.cssClass);
            for (var property in lazyLoader.style) {
                if (lazyLoader.style.hasOwnProperty(property)) {
                    that._elements.image.style[property] = "";
                }
            }
            that._elements.image.removeEventListener("load", removeLazyLoader);
            that._lazyLoaderShowing = false;
        }

        function isLazyVisible() {
            if (that._elements.container.offsetParent === null) {
                return false;
            }

            var wt = window.pageYOffset;
            var wb = wt + document.documentElement.clientHeight;
            var et = that._elements.container.getBoundingClientRect().top + wt;
            var eb = et + that._elements.container.clientHeight;

            return eb >= wt - LAZY_THRESHOLD && et <= wb + LAZY_THRESHOLD;
        }

        function resizeAreas() {
            if (that._elements.areas && that._elements.areas.length > 0) {
                for (var i = 0; i < that._elements.areas.length; i++) {
                    var width = that._elements.image.width;
                    var height = that._elements.image.height;

                    if (width && height) {
                        var relcoords = that._elements.areas[i].dataset.cmpRelcoords;
                        if (relcoords) {
                            var relativeCoordinates = relcoords.split(",");
                            var coordinates = new Array(relativeCoordinates.length);

                            for (var j = 0; j < coordinates.length; j++) {
                                if (j % 2 === 0) {
                                    coordinates[j] = parseInt(relativeCoordinates[j] * width);
                                } else {
                                    coordinates[j] = parseInt(relativeCoordinates[j] * height);
                                }
                            }

                            that._elements.areas[i].coords = coordinates;
                        }
                    }
                }
            }
        }

        function cacheElements(wrapper) {
            that._elements = {};
            that._elements.self = wrapper;
            var hooks = that._elements.self.querySelectorAll("[data-" + NS + "-hook-" + IS + "]");

            for (var i = 0; i < hooks.length; i++) {
                var hook = hooks[i];
                var capitalized = IS;
                capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
                var key = hook.dataset[NS + "Hook" + capitalized];
                that._elements[key] = hook;
            }
        }

        function setupProperties(options) {
            that._properties = {};

            for (var key in properties) {
                if (properties.hasOwnProperty(key)) {
                    var property = properties[key];
                    if (options && options[key] != null) {
                        if (property && typeof property.transform === "function") {
                            that._properties[key] = property.transform(options[key]);
                        } else {
                            that._properties[key] = options[key];
                        }
                    } else {
                        that._properties[key] = properties[key]["default"];
                    }
                }
            }
        }

        function onWindowResize() {
            that.update();
            resizeAreas();
        }

        function onLoad() {
            resizeAreas();
        }

        that.update = function() {
            if (that._properties.lazy) {
                if (isLazyVisible()) {
                    loadImage();
                }
            } else {
                loadImage();
            }
        };

        if (config && config.element) {
            init(config);
        }
    }

    function onDocumentReady() {
        var elements = document.querySelectorAll(selectors.self);
        for (var i = 0; i < elements.length; i++) {
            new Image({ element: elements[i], options: readData(elements[i]) });
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var body             = document.querySelector("body");
        var observer         = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // needed for IE
                var nodesArray = [].slice.call(mutation.addedNodes);
                if (nodesArray.length > 0) {
                    nodesArray.forEach(function(addedNode) {
                        if (addedNode.querySelectorAll) {
                            var elementsArray = [].slice.call(addedNode.querySelectorAll(selectors.self));
                            elementsArray.forEach(function(element) {
                                new Image({ element: element, options: readData(element) });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(body, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    if (document.readyState !== "loading") {
        onDocumentReady();
    } else {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
    }

    /*
        on drag & drop of the component into a parsys, noscript's content will be escaped multiple times by the editor which creates
        the DOM for editing; the HTML parser cannot be used here due to the multiple escaping
     */
    function decodeNoscript(text) {
        text = text.replace(/&(amp;)*lt;/g, "<");
        text = text.replace(/&(amp;)*gt;/g, ">");
        return text;
    }

})();

/*******************************************************************************
 * Copyright 2017 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/
(function() {
    "use strict";

    var NS = "cmp";
    var IS = "search";

    var DELAY = 300; // time before fetching new results when the user is typing a search string
    var LOADING_DISPLAY_DELAY = 300; // minimum time during which the loading indicator is displayed
    var PARAM_RESULTS_OFFSET = "resultsOffset";

    var keyCodes = {
        TAB: 9,
        ENTER: 13,
        ESCAPE: 27,
        ARROW_UP: 38,
        ARROW_DOWN: 40
    };

    var selectors = {
        self: "[data-" + NS + '-is="' + IS + '"]',
        item: {
            self: "[data-" + NS + "-hook-" + IS + '="item"]',
            title: "[data-" + NS + "-hook-" + IS + '="itemTitle"]',
            focused: "." + NS + "-search__item--is-focused"
        }
    };

    var properties = {
        /**
         * The minimum required length of the search term before results are fetched.
         *
         * @memberof Search
         * @type {Number}
         * @default 3
         */
        minLength: {
            "default": 3,
            transform: function(value) {
                value = parseFloat(value);
                return isNaN(value) ? null : value;
            }
        },
        /**
         * The maximal number of results fetched by a search request.
         *
         * @memberof Search
         * @type {Number}
         * @default 10
         */
        resultsSize: {
            "default": 10,
            transform: function(value) {
                value = parseFloat(value);
                return isNaN(value) ? null : value;
            }
        }
    };

    var idCount = 0;

    function readData(element) {
        var data = element.dataset;
        var options = [];
        var capitalized = IS;
        capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
        var reserved = ["is", "hook" + capitalized];

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];

                if (key.indexOf(NS) === 0) {
                    key = key.slice(NS.length);
                    key = key.charAt(0).toLowerCase() + key.substring(1);

                    if (reserved.indexOf(key) === -1) {
                        options[key] = value;
                    }
                }
            }
        }

        return options;
    }

    function toggleShow(element, show) {
        if (element) {
            if (show !== false) {
                element.style.display = "block";
                element.setAttribute("aria-hidden", false);
            } else {
                element.style.display = "none";
                element.setAttribute("aria-hidden", true);
            }
        }
    }

    function serialize(form) {
        var query = [];
        if (form && form.elements) {
            for (var i = 0; i < form.elements.length; i++) {
                var node = form.elements[i];
                if (!node.disabled && node.name) {
                    var param = [node.name, encodeURIComponent(node.value)];
                    query.push(param.join("="));
                }
            }
        }
        return query.join("&");
    }

    function mark(node, regex) {
        if (!node || !regex) {
            return;
        }

        // text nodes
        if (node.nodeType === 3) {
            var nodeValue = node.nodeValue;
            var match = regex.exec(nodeValue);

            if (nodeValue && match) {
                var element = document.createElement("mark");
                element.className = NS + "-search__item-mark";
                element.appendChild(document.createTextNode(match[0]));

                var after = node.splitText(match.index);
                after.nodeValue = after.nodeValue.substring(match[0].length);
                node.parentNode.insertBefore(element, after);
            }
        } else if (node.hasChildNodes()) {
            for (var i = 0; i < node.childNodes.length; i++) {
                // recurse
                mark(node.childNodes[i], regex);
            }
        }
    }

    function Search(config) {
        if (config.element) {
            // prevents multiple initialization
            config.element.removeAttribute("data-" + NS + "-is");
        }

        this._cacheElements(config.element);
        this._setupProperties(config.options);

        this._action = this._elements.form.getAttribute("action");
        this._resultsOffset = 0;
        this._hasMoreResults = true;

        this._elements.input.addEventListener("input", this._onInput.bind(this));
        this._elements.input.addEventListener("focus", this._onInput.bind(this));
        this._elements.input.addEventListener("keydown", this._onKeydown.bind(this));
        this._elements.clear.addEventListener("click", this._onClearClick.bind(this));
        document.addEventListener("click", this._onDocumentClick.bind(this));
        this._elements.results.addEventListener("scroll", this._onScroll.bind(this));

        this._makeAccessible();
    }

    Search.prototype._displayResults = function() {
        if (this._elements.input.value.length === 0) {
            toggleShow(this._elements.clear, false);
            this._cancelResults();
        } else if (this._elements.input.value.length < this._properties.minLength) {
            toggleShow(this._elements.clear, true);
        } else {
            this._updateResults();
            toggleShow(this._elements.clear, true);
        }
    };

    Search.prototype._onScroll = function(event) {
        // fetch new results when the results to be scrolled down are less than the visible results
        if (this._elements.results.scrollTop + 2 * this._elements.results.clientHeight >= this._elements.results.scrollHeight) {
            this._resultsOffset += this._properties.resultsSize;
            this._displayResults();
        }
    };

    Search.prototype._onInput = function(event) {
        var self = this;
        self._cancelResults();
        // start searching when the search term reaches the minimum length
        this._timeout = setTimeout(function() {
            self._displayResults();
        }, DELAY);
    };

    Search.prototype._onKeydown = function(event) {
        var self = this;

        switch (event.keyCode) {
            case keyCodes.TAB:
                if (self._resultsOpen()) {
                    event.preventDefault();
                }
                break;
            case keyCodes.ENTER:
                event.preventDefault();
                if (self._resultsOpen()) {
                    var focused = self._elements.results.querySelector(selectors.item.focused);
                    if (focused) {
                        focused.click();
                    }
                }
                break;
            case keyCodes.ESCAPE:
                self._cancelResults();
                break;
            case keyCodes.ARROW_UP:
                if (self._resultsOpen()) {
                    event.preventDefault();
                    self._stepResultFocus(true);
                }
                break;
            case keyCodes.ARROW_DOWN:
                if (self._resultsOpen()) {
                    event.preventDefault();
                    self._stepResultFocus();
                } else {
                    // test the input and if necessary fetch and display the results
                    self._onInput();
                }
                break;
            default:
                return;
        }
    };

    Search.prototype._onClearClick = function(event) {
        event.preventDefault();
        this._elements.input.value = "";
        toggleShow(this._elements.clear, false);
        toggleShow(this._elements.results, false);
    };

    Search.prototype._onDocumentClick = function(event) {
        var inputContainsTarget =  this._elements.input.contains(event.target);
        var resultsContainTarget = this._elements.results.contains(event.target);

        if (!(inputContainsTarget || resultsContainTarget)) {
            toggleShow(this._elements.results, false);
        }
    };

    Search.prototype._resultsOpen = function() {
        return this._elements.results.style.display !== "none";
    };

    Search.prototype._makeAccessible = function() {
        var id = NS + "-search-results-" + idCount;
        this._elements.input.setAttribute("aria-owns", id);
        this._elements.results.id = id;
        idCount++;
    };

    Search.prototype._generateItems = function(data, results) {
        var self = this;

        data.forEach(function(item) {
            var el = document.createElement("span");
            el.innerHTML = self._elements.itemTemplate.innerHTML;
            el.querySelectorAll(selectors.item.title)[0].appendChild(document.createTextNode(item.title));
            el.querySelectorAll(selectors.item.self)[0].setAttribute("href", item.url);
            results.innerHTML += el.innerHTML;
        });
    };

    Search.prototype._markResults = function() {
        var nodeList = this._elements.results.querySelectorAll(selectors.item.self);
        var escapedTerm = this._elements.input.value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        var regex = new RegExp("(" + escapedTerm + ")", "gi");

        for (var i = this._resultsOffset - 1; i < nodeList.length; ++i) {
            var result = nodeList[i];
            mark(result, regex);
        }
    };

    Search.prototype._stepResultFocus = function(reverse) {
        var results = this._elements.results.querySelectorAll(selectors.item.self);
        var focused = this._elements.results.querySelector(selectors.item.focused);
        var newFocused;
        var index = Array.prototype.indexOf.call(results, focused);
        var focusedCssClass = NS + "-search__item--is-focused";

        if (results.length > 0) {

            if (!reverse) {
                // highlight the next result
                if (index < 0) {
                    results[0].classList.add(focusedCssClass);
                } else if (index + 1 < results.length) {
                    results[index].classList.remove(focusedCssClass);
                    results[index + 1].classList.add(focusedCssClass);
                }

                // if the last visible result is partially hidden, scroll up until it's completely visible
                newFocused = this._elements.results.querySelector(selectors.item.focused);
                if (newFocused) {
                    var bottomHiddenHeight = newFocused.offsetTop + newFocused.offsetHeight - this._elements.results.scrollTop - this._elements.results.clientHeight;
                    if (bottomHiddenHeight > 0) {
                        this._elements.results.scrollTop += bottomHiddenHeight;
                    } else {
                        this._onScroll();
                    }
                }

            } else {
                // highlight the previous result
                if (index >= 1) {
                    results[index].classList.remove(focusedCssClass);
                    results[index - 1].classList.add(focusedCssClass);
                }

                // if the first visible result is partially hidden, scroll down until it's completely visible
                newFocused = this._elements.results.querySelector(selectors.item.focused);
                if (newFocused) {
                    var topHiddenHeight = this._elements.results.scrollTop - newFocused.offsetTop;
                    if (topHiddenHeight > 0) {
                        this._elements.results.scrollTop -= topHiddenHeight;
                    }
                }
            }
        }
    };

    Search.prototype._updateResults = function() {
        var self = this;
        if (self._hasMoreResults) {
            var request = new XMLHttpRequest();
            var url = self._action + "?" + serialize(self._elements.form) + "&" + PARAM_RESULTS_OFFSET + "=" + self._resultsOffset;

            request.open("GET", url, true);
            request.onload = function() {
                // when the results are loaded: hide the loading indicator and display the search icon after a minimum period
                setTimeout(function() {
                    toggleShow(self._elements.loadingIndicator, false);
                    toggleShow(self._elements.icon, true);
                }, LOADING_DISPLAY_DELAY);
                if (request.status >= 200 && request.status < 400) {
                    // success status
                    var data = JSON.parse(request.responseText);
                    if (data.length > 0) {
                        self._generateItems(data, self._elements.results);
                        self._markResults();
                        toggleShow(self._elements.results, true);
                    } else {
                        self._hasMoreResults = false;
                    }
                    // the total number of results is not a multiple of the fetched results:
                    // -> we reached the end of the query
                    if (self._elements.results.querySelectorAll(selectors.item.self).length % self._properties.resultsSize > 0) {
                        self._hasMoreResults = false;
                    }
                } else {
                    // error status
                }
            };
            // when the results are loading: display the loading indicator and hide the search icon
            toggleShow(self._elements.loadingIndicator, true);
            toggleShow(self._elements.icon, false);
            request.send();
        }
    };

    Search.prototype._cancelResults = function() {
        clearTimeout(this._timeout);
        this._elements.results.scrollTop = 0;
        this._resultsOffset = 0;
        this._hasMoreResults = true;
        this._elements.results.innerHTML = "";
    };

    Search.prototype._cacheElements = function(wrapper) {
        this._elements = {};
        this._elements.self = wrapper;
        var hooks = this._elements.self.querySelectorAll("[data-" + NS + "-hook-" + IS + "]");

        for (var i = 0; i < hooks.length; i++) {
            var hook = hooks[i];
            var capitalized = IS;
            capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
            var key = hook.dataset[NS + "Hook" + capitalized];
            this._elements[key] = hook;
        }
    };

    Search.prototype._setupProperties = function(options) {
        this._properties = {};

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                var property = properties[key];
                if (options && options[key] != null) {
                    if (property && typeof property.transform === "function") {
                        this._properties[key] = property.transform(options[key]);
                    } else {
                        this._properties[key] = options[key];
                    }
                } else {
                    this._properties[key] = properties[key]["default"];
                }
            }
        }
    };

    function onDocumentReady() {
        var elements = document.querySelectorAll(selectors.self);
        for (var i = 0; i < elements.length; i++) {
            new Search({ element: elements[i], options: readData(elements[i]) });
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var body = document.querySelector("body");
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // needed for IE
                var nodesArray = [].slice.call(mutation.addedNodes);
                if (nodesArray.length > 0) {
                    nodesArray.forEach(function(addedNode) {
                        if (addedNode.querySelectorAll) {
                            var elementsArray = [].slice.call(addedNode.querySelectorAll(selectors.self));
                            elementsArray.forEach(function(element) {
                                new Search({ element: element, options: readData(element) });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(body, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    if (document.readyState !== "loading") {
        onDocumentReady();
    } else {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
    }

})();

/*******************************************************************************
 * Copyright 2016 Adobe Systems Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/
(function() {
    "use strict";

    var NS = "cmp";
    var IS = "formText";
    var IS_DASH = "form-text";

    var selectors = {
        self: "[data-" + NS + '-is="' + IS + '"]'
    };

    var properties = {
        /**
         * A validation message to display if there is a type mismatch between the user input and expected input.
         *
         * @type {String}
         */
        constraintMessage: {
        },
        /**
         * A validation message to display if no input is supplied, but input is expected for the field.
         *
         * @type {String}
         */
        requiredMessage: {
        }
    };

    function readData(element) {
        var data = element.dataset;
        var options = [];
        var capitalized = IS;
        capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
        var reserved = ["is", "hook" + capitalized];

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];

                if (key.indexOf(NS) === 0) {
                    key = key.slice(NS.length);
                    key = key.charAt(0).toLowerCase() + key.substring(1);

                    if (reserved.indexOf(key) === -1) {
                        options[key] = value;
                    }
                }
            }
        }

        return options;
    }

    function FormText(config) {
        if (config.element) {
            // prevents multiple initialization
            config.element.removeAttribute("data-" + NS + "-is");
        }

        this._cacheElements(config.element);
        this._setupProperties(config.options);

        this._elements.input.addEventListener("invalid", this._onInvalid.bind(this));
        this._elements.input.addEventListener("input", this._onInput.bind(this));
    }

    FormText.prototype._onInvalid = function(event) {
        event.target.setCustomValidity("");
        if (event.target.validity.typeMismatch) {
            if (this._properties.constraintMessage) {
                event.target.setCustomValidity(this._properties.constraintMessage);
            }
        } else if (event.target.validity.valueMissing) {
            if (this._properties.requiredMessage) {
                event.target.setCustomValidity(this._properties.requiredMessage);
            }
        }
    };

    FormText.prototype._onInput = function(event) {
        event.target.setCustomValidity("");
    };

    FormText.prototype._cacheElements = function(wrapper) {
        this._elements = {};
        this._elements.self = wrapper;
        var hooks = this._elements.self.querySelectorAll("[data-" + NS + "-hook-" + IS_DASH + "]");
        for (var i = 0; i < hooks.length; i++) {
            var hook = hooks[i];
            var capitalized = IS;
            capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
            var key = hook.dataset[NS + "Hook" + capitalized];
            this._elements[key] = hook;
        }
    };

    FormText.prototype._setupProperties = function(options) {
        this._properties = {};

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                var property = properties[key];
                if (options && options[key] != null) {
                    if (property && typeof property.transform === "function") {
                        this._properties[key] = property.transform(options[key]);
                    } else {
                        this._properties[key] = options[key];
                    }
                } else {
                    this._properties[key] = properties[key]["default"];
                }
            }
        }
    };

    function onDocumentReady() {
        var elements = document.querySelectorAll(selectors.self);
        for (var i = 0; i < elements.length; i++) {
            new FormText({ element: elements[i], options: readData(elements[i]) });
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var body = document.querySelector("body");
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // needed for IE
                var nodesArray = [].slice.call(mutation.addedNodes);
                if (nodesArray.length > 0) {
                    nodesArray.forEach(function(addedNode) {
                        if (addedNode.querySelectorAll) {
                            var elementsArray = [].slice.call(addedNode.querySelectorAll(selectors.self));
                            elementsArray.forEach(function(element) {
                                new FormText({ element: element, options: readData(element) });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(body, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    if (document.readyState !== "loading") {
        onDocumentReady();
    } else {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
    }

})();

(function (document, $) {
	"use strict";

	let selectWrapper;
	let toggleRightAlign;
	let selectList;

	$(document).on("foundation-contentloaded", function (e) {
		//grab parent of icon selector to access both the selectionList and checkbox-toggle
		selectWrapper = $(".cq-dialog-button-icon-selector").closest(".coral-FixedColumn-column");
		toggleRightAlign = $(selectWrapper).find(".cq-dialog-hidden-toggle-right-align");
		selectList = $(".cq-dialog-button-icon-selector").find(".coral-SelectList");
	});	

	//set right arrow on selection
	$(document).on("selected", ".cq-dialog-button-icon-selector", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//re-set right arrow when title is edited
	$(document).on("change", ".cq-dialog-button-title", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//this logic triggers a click on hidden checkbox toggle right aligned
	//icon in button.html when a right arrow icon is selected
	function iconSelectionHandler(listElement,toggleElement) {
		let currentSelection = listElement.find("[aria-selected='true']").html();
		//if right arrow is selected, trigger click on hidden toggle
		toggleElement.each(function (i, element) {
			if($(element).is("coral-checkbox")) {
				// handle Coral3 base drop-down
				Coral.commons.ready(element, function (component) {
					if(currentSelection === 'Arrow Right'){
						component.trigger('click');
					}
				});
			} else {
				// handle Coral2 based drop-down
				var component = $(element).data("checkbox");
				if(currentSelection === 'Arrow Right'){
					component.trigger('click');
				}
			}
		})
	}
})(document, Granite.$);
(function (document, $) {
	"use strict";

	let selectWrapper;
	let toggleRightAlign;
	let selectList;

	$(document).on("foundation-contentloaded", function (e) {
		//grab parent of icon selector to access both the selectionList and checkbox-toggle
		selectWrapper = $(".cq-dialog-button-icon-selector").closest(".coral-FixedColumn-column");
		toggleRightAlign = $(selectWrapper).find(".cq-dialog-hidden-toggle-right-align");
		selectList = $(".cq-dialog-button-icon-selector").find(".coral-SelectList");
	});	

	//set right arrow on selection
	$(document).on("selected", ".cq-dialog-button-icon-selector", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//re-set right arrow when title is edited
	$(document).on("change", ".cq-dialog-button-title", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//this logic triggers a click on hidden checkbox toggle right aligned
	//icon in button.html when a right arrow icon is selected
	function iconSelectionHandler(listElement,toggleElement) {
		let currentSelection = listElement.find("[aria-selected='true']").html();
		//if right arrow is selected, trigger click on hidden toggle
		toggleElement.each(function (i, element) {
			if($(element).is("coral-checkbox")) {
				// handle Coral3 base drop-down
				Coral.commons.ready(element, function (component) {
					if(currentSelection === 'Arrow Right'){
						component.trigger('click');
					}
				});
			} else {
				// handle Coral2 based drop-down
				var component = $(element).data("checkbox");
				if(currentSelection === 'Arrow Right'){
					component.trigger('click');
				}
			}
		})
	}
})(document, Granite.$);
//Fix to declare custom container as responsive
(function ($, ns, channel, window, undefined) {
    var url = window.location.href;
    if(url.includes('/editor.html/')) {
        ns.responsive.isResponsiveGrid = function (editable) { 
            return editable.type === '/libs/wcm/foundation/components/responsivegrid' || '/apps/enterprise/components/content/responsivegrid'; 
        } 
    }
}
(jQuery, Granite.author, jQuery(document), this));
/**
 * How to use:
 *
 * 1. Add class to checkbox
 *
 *		Example: granite:class="cq-dialog-checkbox-showhide"
 *
 * 2. Add cq-dialog-checkbox-showhide-target data-attribute to checkbox with the value being the selector to target for toggleing
 *
 *		Example: cq-dialog-checkbox-showhide-target=".togglefield"
 *
 * 3. Add target class to toggleable fields or components
 *
 *	    Example: granite:class="togglefield"
 */
(function (document, $) {
    "use strict";

    // when dialog gets injected
    $(document).on("foundation-contentloaded", function (e) {
        // if there is already an inital value make sure the according target element becomes visible
        checkboxShowHideHandler($(".cq-dialog-checkbox-showhide", e.target));
    });

    $(document).on("change", ".cq-dialog-checkbox-showhide", function (e) {
        checkboxShowHideHandler($(this));
    });

    function checkboxShowHideHandler(el) {
        el.each(function (i, element) {
            if($(element).is("coral-checkbox")) {
                // handle Coral3 base drop-down
                Coral.commons.ready(element, function (component) {
                    showHide(component, element);
                    component.on("change", function () {
                        showHide(component, element);
                    });
                });
            } else {
                // handle Coral2 based drop-down
                var component = $(element).data("checkbox");
                if (component) {
                    showHide(component, element);
                }
            }
        })
    }

    function showHide(component, element) {
        // get the selector to find the target elements. its stored as data-.. attribute
        var target = $(element).data("cqDialogCheckboxShowhideTarget");
        var $target = $(target);


        if (target) {
            $target.addClass("hide");
            if (component.checked) {
                $target.removeClass("hide");
            }
        }
    }
})(document, Granite.$);
$(document).ready(function(){
	"use strict";

	var cardParents;
	var called = 0;

	/* grab all parent grids with standard height child cards on page */
	function getAllPageStandardizedCardParents(){
		cardParents = $('.responsivegrid .standard-height').toArray();
	}

	function findStandardCardHeight(childCards){
		var maxHeight = 0;
		/* base standard height on tallest card in group */
		childCards.forEach(function(card){
			/* set card to auto to get base unaltered height */
			$(card).find('> .aem-Grid:first-child').css("height", "auto");
			var cardHeight = $(card).height();
			maxHeight = maxHeight >= cardHeight ? maxHeight : cardHeight;
		})
		return maxHeight;
	}

	function processCardHeights(parent){
		var childCards = $(parent).children('.responsivegrid').toArray();
		var standardHeight = findStandardCardHeight(childCards);
		childCards.forEach(function(card){
			setCardHeight(card,standardHeight);
		})
	}

	function setCardHeight(card, height){
		card = $(card).find('> .aem-Grid:first-child');
		card.css('height', height);		
	}

	$(window).load(function(){
		getAllPageStandardizedCardParents();
		cardParents.forEach(processCardHeights)
	})
	$(window).resize(function(){
		cardParents.forEach(processCardHeights)
	})
});
(function (document, $) {
	"use strict";

	let decorativeToggle;
	let altTextBox;

	// Toggles alt text requirement depending on whether or not image is decorative
	// If image is decorative, alt text is NOT required and vice versa.

	$(document).on("foundation-contentloaded", function (e) {
		decorativeToggle = $(".decorative-checkbox input");
		altTextBox = $("input.image-alt-text");
		$(".decorative-checkbox input").on('click', function(e) {
			$(altTextBox).attr('aria-required', !e.currentTarget.checked);
		});
	});
})(document, Granite.$);
(function (document, $) {
	"use strict";

	let selectWrapper;
	let toggleRightAlign;
	let selectList;

	$(document).on("foundation-contentloaded", function (e) {
		//grab parent of icon selector to access both the selectionList and checkbox-toggle
		selectWrapper = $(".cq-dialog-button-icon-selector").closest(".coral-FixedColumn-column");
		toggleRightAlign = $(selectWrapper).find(".cq-dialog-hidden-toggle-right-align");
		selectList = $(".cq-dialog-button-icon-selector").find(".coral-SelectList");
	});	

	//set right arrow on selection
	$(document).on("selected", ".cq-dialog-button-icon-selector", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//re-set right arrow when title is edited
	$(document).on("change", ".cq-dialog-button-title", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//this logic triggers a click on hidden checkbox toggle right aligned
	//icon in button.html when a right arrow icon is selected
	function iconSelectionHandler(listElement,toggleElement) {
		let currentSelection = listElement.find("[aria-selected='true']").html();
		//if right arrow is selected, trigger click on hidden toggle
		toggleElement.each(function (i, element) {
			if($(element).is("coral-checkbox")) {
				// handle Coral3 base drop-down
				Coral.commons.ready(element, function (component) {
					if(currentSelection === 'Arrow Right'){
						component.trigger('click');
					}
				});
			} else {
				// handle Coral2 based drop-down
				var component = $(element).data("checkbox");
				if(currentSelection === 'Arrow Right'){
					component.trigger('click');
				}
			}
		})
	}
})(document, Granite.$);
$(document).ready(function () {
	let playlists = $(".playlist"),
		carouselLists = $(".heroCarousel"),
		isSlickNeeded = (playlists.length + carouselLists.length) > 0;
	if (isSlickNeeded) {
		// Slick Styles
		let slickCoreStyles = document.createElement("link")
		slickCoreStyles.setAttribute("rel", "stylesheet")
		slickCoreStyles.setAttribute("type", "text/css")
		slickCoreStyles.setAttribute("href", "//cdn.jsdelivr.net/npm/@accessible360/accessible-slick@1.0.1/slick/slick.min.css")
		// Slick Accessible Theme
		let slickAccessibleTheme = document.createElement("link")
		slickAccessibleTheme.setAttribute("rel", "stylesheet")
		slickAccessibleTheme.setAttribute("type", "text/css")
		slickAccessibleTheme.setAttribute("href", "//cdn.jsdelivr.net/npm/@accessible360/accessible-slick@1.0.1/slick/accessible-slick-theme.min.css")
		// Slick Script
		let slickScript = document.createElement("script")
		slickScript.setAttribute("type", "text/javascript")
		slickScript.setAttribute("id", "slickscript")
		slickScript.setAttribute("src", "//cdn.jsdelivr.net/npm/@accessible360/accessible-slick@1.0.1/slick/slick.min.js")
		
		document.head.append(slickCoreStyles, slickAccessibleTheme)
		document.body.append(slickScript)
	}
});
(function ($) {
    'use strict';

    //get all subNavs on page
	var subNavArray = $(".subNav").toArray();

	//link jquery to separate subNav roots to encapsulate styles (such that clicking/editing one subNav will not affect another)
	subNavArray.forEach(function(el){
		linkSubNav(el);
    })
    
    function linkSubNav(root) {
        var subNav = $(root);
        var subNavLinks = subNav.find('.subNav--dropdown-links .subNav--link');
        var subNavDropdown = subNav.find('.subNav--dropdown');
        var subNavDropdownWrapper = subNav.find('.subNav--dropdown-links');
        var subNavDropdownText = subNav.find('.subNav--dropdown-text .subNav--link');
        var subNavDropdownArrow = subNav.find('.subNav--dropdown-downArrowIcon');

        // Calculate height of expanded mobile nav (47px is height of single mobile link)
        var numOfLinks = subNavLinks.length;
        var expandedHeight = numOfLinks * 47;

        // When I click a subNav dropdown link on mobile, collapse and change dropdown text
        subNavLinks.on('keypress click', function(e){
            if (e.which === 13 || e.type === 'click') {
                var selectedLink = subNav.find(e.target).text();
                if (subNavDropdownWrapper.hasClass('expanded')  && ($(window).width() <= 960)) {
                    subNavDropdownText.text(selectedLink);
                    subNavDropdownText.addClass('selected');
                    collapseSubNavDropdown();
                }
            }
        });

        // When I click the subNav dropdown on mobile, expand/collapse
        subNavDropdown.on('keypress click', function(e){
            if (e.which === 13 || e.type === 'click') {
                if(subNavDropdownText.hasClass('selected')) {
                    subNavDropdownText.text('Explore');
                    subNavDropdownText.removeClass('selected');
                }
                if (subNavDropdownWrapper.hasClass('collapsed') && ($(window).width() <= 960)) {
                    expandSubNavDropdown();
                } else if (subNavDropdownWrapper.hasClass('expanded')  && ($(window).width() <= 960)) {
                    collapseSubNavDropdown();
                }
            }
        });

        function expandSubNavDropdown() {
            subNavDropdownArrow.css('transform', 'rotate(180deg)');
            subNavLinks.hide().fadeIn(250);
            subNavDropdownWrapper.animate({height: expandedHeight + 'px'}, 250);
            subNav.animate({height: '+=' + expandedHeight}, 250);
            subNavDropdownWrapper.addClass('expanded').removeClass('collapsed');
        }

        function collapseSubNavDropdown() {
            subNavDropdownArrow.css('transform', 'rotate(0deg)');
            subNavLinks.fadeOut(250);
            subNavDropdownWrapper.animate({height: '0px'}, 250);
            subNav.animate({height: '55px'}, 250);
            subNavDropdownWrapper.addClass('collapsed').removeClass('expanded');
        }
    }

    // Collapse subNav dropdown without animations for window resize
    function collapseSubNavDropdownUnanimated() {
        $('.subNav--dropdown-downArrowIcon').css('transform', 'rotate(0deg)');
        $('.subNav--dropdown-links .subNav--link').css('display', '');
        $('.subNav--dropdown-links').css('height', '');
	    $('.subNav').css('height', '');
        $('.subNav--dropdown-links').addClass('collapsed').removeClass('expanded');
    }

    $(window).resize(function () {
        if ($(window).width() > 960) {
            // Removing jQuery applied inline styles
            collapseSubNavDropdownUnanimated();
            $('.subNav--dropdown-links').css('display', '');
        }
    });

}(jQuery));
//read more/less responsive behavior
(function ($, window, undefined) {

	/* text gradients don't work properly on edge with this
	implementation, so, conditionally remove on edge */
	function disableOnEdgeBrowser(root){
		if(window.navigator.userAgent.indexOf("Edge") > -1){
			$(root).removeClass('display');
		}
	}

	/* get all read-mores on page */
	var readMoreArray = $(".cmp-text__read-more").toArray();

	/* link jquery to separate read-more roots to encapsulate styles */
	readMoreArray.forEach(function(el){
		disableOnEdgeBrowser(el);
		linkReadMore(el);
	})

	function linkReadMore(root){

		var readMore = $(root);
		var readMoreTextWrapper = readMore.find('.cmp-text__read-more-text-wrapper');
		var readMoreToggle = readMore.find(".cmp-text__read-more-toggle");
		var readMoreToggleWrapper = readMore.find(".cmp-text__read-more-toggle-wrapper");
		var readMoreArrow = readMore.find(".cmp-text__read-more-arrow");

		readMoreToggleWrapper.click(function(){
			var label = readMoreToggle.text();
			if(label === 'READ MORE') {
				var isMobile = window.matchMedia('(max-width: 719px)').matches
				readMore.toggleClass("expanded");
				if(isMobile){
					readMoreTextWrapper.css("max-height", "1200px");
				} else {
					readMoreTextWrapper.css("max-height", "800px");
				}
				readMoreToggle.text('READ LESS');
				readMoreArrow.addClass('up');
				readMoreTextWrapper.removeClass('gradient');
				setTimeout(function(){
					var actualHeight = readMoreTextWrapper.height();
					readMoreTextWrapper.css("max-height", actualHeight);
				}, 500)
			} else {
				/* delay for smoother animation */
				var isMobile = window.matchMedia('(max-width: 719px)').matches
				if(isMobile){
					readMore.toggleClass("expanded");
					readMoreTextWrapper.css("max-height", "117px");
				} else {
					readMore.toggleClass("expanded");
					readMoreTextWrapper.css("max-height", "70px");
				}
				setTimeout(function(){
					readMoreToggle.text('READ MORE');
					readMoreArrow.removeClass('up');
					readMoreTextWrapper.addClass('gradient');
				}, 400)
			}
		})

		/* reset readmore height on resize */
		window.addEventListener('resize', function(){
			var isMobile = window.matchMedia('(max-width: 719px)').matches
			var isExpanded = readMore.hasClass("expanded");
			if(!isExpanded){
				if(isMobile){
					readMoreTextWrapper.css("max-height", "117px");
				} else {
					readMoreTextWrapper.css("max-height", "70px");
				}
			}
		});

	}
}
(jQuery, this));
(function ($) {
	'use strict';

	//get all buttons on page
	var buttonArray = $('.button').toArray();

	//link jquery to separate button roots to encapsulate styles (such that clicking one button will not affect another)
	buttonArray.forEach(function(el){
		if($(el).has('.video-modal').length){
			linkButton(el);
		}
	})

	function linkButton(root) {
		var button = $(root);
		var videoModal = button.find('.video-modal');
		var videoModalOverlay = button.find('.video-modal__overlay');
		var closeButton = button.find('.video-modal__close');
		var iframe = $(videoModal).find('iframe.video-modal__player');
		var iframeClone = iframe.clone();
		var videoModalContainer = $(videoModal).find('.video-modal__container')		

		button.find('.cmp-title').click(function () {
			showVideoModal();
			disableScroll();
		})

		//hide modal when clicking on the close button or anywhere outside the video
		closeButton.add(videoModalOverlay).click(function () {
			hideVideoModal();
			recycleIframe();
			resumeScroll();
		})

		function showVideoModal() {
			videoModal.addClass('open');
			videoModal.show();
			//push global nav behind modal
			$('.learnPageNav .global-nav').css("z-index", "0");
		}

		function hideVideoModal() {
			videoModal.removeClass('open');
			videoModal.hide();
			//reset global nav above content
			$('.learnPageNav .global-nav').css("z-index", "1");
		}

		function disableScroll(){
			if(videoModal.hasClass('open')){
				$('html').css({
					overflow : 'hidden',
					height: '100%'
				});
			}
		}
		
		function resumeScroll(){
			$('html').css({
				overflow : 'auto',
				height: 'auto'
			});
		}

		/* to break all playback */
		function recycleIframe() {
			iframe.remove()
			videoModalContainer.append(iframeClone)
		}		
	}
}(jQuery));
(function ($) {
	'use strict';

	//get all images on page
	var imageArray = $('.image').toArray();

	//link jquery to separate image roots to encapsulate styles (such that clicking one image will not affect another)
	imageArray.forEach(function(el){
		if($(el).has('.video-modal').length){
			linkImage(el);
		}
	})

	function linkImage(root) {
		var image = $(root);
		var videoModal = image.find('.video-modal');
		var videoModalOverlay = image.find('.video-modal__overlay');
		var closeButton = image.find('.video-modal__close');
		var iframe = $(videoModal).find('iframe.video-modal__player');
		var iframeClone = iframe.clone();
		var videoModalContainer = $(videoModal).find('.video-modal__container')
		var imageLink = image.find('.cmp-image__link');

		imageLink.addClass('cmp-image__video-modal');
		imageLink.click(function () {
			showVideoModal();
			disableScroll();
		})

		//hide modal when clicking on the close image or anywhere outside the video
		closeButton.add(videoModalOverlay).click(function () {
			hideVideoModal();
			recycleIframe();
			resumeScroll();
		})

		function showVideoModal() {
			videoModal.addClass('open');
			videoModal.show();
			//push global nav behind modal
			$('.learnPageNav .global-nav').css("z-index", "0");
		}

		function hideVideoModal() {
			videoModal.removeClass('open');
			videoModal.hide();
			//reset global nav above content
			$('.learnPageNav .global-nav').css("z-index", "1");
		}

		function disableScroll(){
			if(videoModal.hasClass('open')){
				$('html').css({
					overflow : 'hidden',
					height: '100%'
				});
			}
		}
		
		function resumeScroll(){
			$('html').css({
				overflow : 'auto',
				height: 'auto'
			});
		}

		/* to break all playback */
		function recycleIframe() {
			iframe.remove()
			videoModalContainer.append(iframeClone)
		}		
	}
}(jQuery));
(function ($) {
	'use strict';

	//get all labels on page
	var labelArray = $('.labelTextLink').toArray();

	//link jquery to separate label roots to encapsulate styles (such that clicking one image will not affect another)
	labelArray.forEach(function(el){
		if($(el).has('.video-modal').length){
			linkLabel(el);
		}
	})

	function linkLabel(root) {
		var label = $(root);
		var videoModal = label.find('.video-modal');
		var videoModalOverlay = label.find('.video-modal__overlay');
		var closeButton = label.find('.video-modal__close');
		var iframe = $(videoModal).find('iframe.video-modal__player');
		var iframeClone = iframe.clone();
		var videoModalContainer = $(videoModal).find('.video-modal__container')
		var labelLink = label.find('.cmp-title');

		labelLink.addClass('cmp-title__video-modal');
		labelLink.click(function () {
			showVideoModal();
			disableScroll();
		})

		//hide modal when clicking on the close image or anywhere outside the video
		closeButton.add(videoModalOverlay).click(function () {
			hideVideoModal();
			recycleIframe();
			resumeScroll();
		})

		function showVideoModal() {
			videoModal.addClass('open');
			videoModal.show();
			//push global nav behind modal
			$('.learnPageNav .global-nav').css("z-index", "0");
		}

		function hideVideoModal() {
			videoModal.removeClass('open');
			videoModal.hide();
			//reset global nav above content
			$('.learnPageNav .global-nav').css("z-index", "1");
		}

		function disableScroll(){
			if(videoModal.hasClass('open')){
				$('html').css({
					overflow : 'hidden',
					height: '100%'
				});
			}
		}
		
		function resumeScroll(){
			$('html').css({
				overflow : 'auto',
				height: 'auto'
			});
		}

		/* to break all playback */
		function recycleIframe() {
			iframe.remove()
			videoModalContainer.append(iframeClone)
		}		
	}
}(jQuery));
(function ($) {
	'use strict';

	//get all labels on page
	var labelArray = $('.label').toArray();

	//link jquery to separate label roots to encapsulate styles (such that clicking one image will not affect another)
	labelArray.forEach(function(el){
		if($(el).has('.video-modal').length){
			linkLabel(el);
		}
	})

	function linkLabel(root) {
		var label = $(root);
		var videoModal = label.find('.video-modal');
		var videoModalOverlay = label.find('.video-modal__overlay');
		var closeButton = label.find('.video-modal__close');
		var iframe = $(videoModal).find('iframe.video-modal__player');
		var iframeClone = iframe.clone();
		var videoModalContainer = $(videoModal).find('.video-modal__container')
		var labelLink = label.find('.cmp-title');

		labelLink.addClass('cmp-title__video-modal');
		labelLink.click(function () {
			showVideoModal();
			disableScroll();
		})

		//hide modal when clicking on the close image or anywhere outside the video
		closeButton.add(videoModalOverlay).click(function () {
			hideVideoModal();
			recycleIframe();
			resumeScroll();
		})

		function showVideoModal() {
			videoModal.addClass('open');
			videoModal.show();
			//push global nav behind modal
			$('.learnPageNav .global-nav').css("z-index", "0");
		}

		function hideVideoModal() {
			videoModal.removeClass('open');
			videoModal.hide();
			//reset global nav above content
			$('.learnPageNav .global-nav').css("z-index", "1");
		}

		function disableScroll(){
			if(videoModal.hasClass('open')){
				$('html').css({
					overflow : 'hidden',
					height: '100%'
				});
			}
		}
		
		function resumeScroll(){
			$('html').css({
				overflow : 'auto',
				height: 'auto'
			});
		}

		/* to break all playback */
		function recycleIframe() {
			iframe.remove()
			videoModalContainer.append(iframeClone)
		}		
	}
}(jQuery));
$(function () {
	'use strict';
	const root = $("#enterprise-fatFooter");

	const is5columnfooter = root.find('.columnFive').length > 0;
	//Adding specific styles for 5 column footers
	if(is5columnfooter){
		root.addClass('five-columns');
	}

	//Clicking on the links in mobile
	root.find('.cmp-fatFooter__column').click( function(){
		if((!is5columnfooter && window.innerWidth < 960) ||(is5columnfooter && window.innerWidth < 1280) ){
			root.find('.cmp-fatFooter__column').not(this).addClass('collapsed').removeClass('expanded');
			root.find(".cmp-fatFooter__initialLinks").hide();
			root.find(".downArrow").not(this).css('transform', 'rotate(0deg)');

			//Expand or collapse this particular column
			if ($(this).hasClass('expanded')) {
				$(this).find(".downArrow").css('transform', 'rotate(0deg)');
				$(this).removeClass('expanded').addClass('collapsed');
				$(this).find(".cmp-fatFooter__initialLinks").css('display', 'none');
				
			}else if ($(this).hasClass('collapsed')) {
				$(this).find(".downArrow").css('transform', 'rotate(180deg)');
				$(this).find(".cmp-fatFooter__initialLinks").css('display', 'block');
				$(this).addClass('expanded').removeClass('collapsed');
			}
		}
	});
		/**
			Calculates number of links in each column
			if column has more than 5 links, hides links 6-10 and adds See More CTA
		*/
		let setSeeMore  = function(){

			let columnOneLinks = root.find('.columnOne');
			let columnTwoLinks = root.find('.columnTwo');
			let columnThreeLinks = root.find('.columnThree');
			let columnFourLinks = root.find('.columnFour');
			let columnFiveLinks = root.find('.columnFive');

			root.find('.collapseInitial').attr('tabindex', '0');
			root.find('.expandInitial').attr('tabindex', '0');
		
			if(columnOneLinks.length > 5){
				root.find('.expandColOne').css('display', 'flex');
				columnOneLinks.each(function(i){
					if(i > 4){
						$(this).addClass('showLess');
					}
				})
			}
			if(columnTwoLinks.length > 5){
				root.find('.expandColTwo').css('display', 'flex');
				columnTwoLinks.each(function(i){
					if(i > 4){
						$(this).addClass('showLess');
					}
				})
			}
			if(columnThreeLinks.length > 5){
				root.find('.expandColThree').css('display', 'flex');
				columnThreeLinks.each(function(i){
					if(i > 4){
						$(this).addClass('showLess');
					}
				})
			}
			if(columnFourLinks.length > 5){
				root.find('.expandColFour').css('display', 'flex');
				columnFourLinks.each(function(i){
					if(i > 4){
						$(this).addClass('showLess');
					}
				})
			}
			if(columnFiveLinks.length > 5){
				root.find('.expandColFive').css('display', 'flex');
				columnFiveLinks.each(function(i){
					if(i > 4){
						$(this).addClass('showLess');
					}
				})
			}

		}

		//Calls above function on render of component

		if(window.innerWidth > 760){
			setSeeMore();
		}

		//executed if  "See More" CTA is clicked
		//expands list of links in column to show hidden links in that particular column
		// replaces "See More" CTA with "See Less" CTA
		root.find('.expandInitial').on('click keydown', function(event) {
			if (event.type === 'click' || (event.type === 'keydown' && (event.key === 'Enter' || event.key === ' '))) {
				if($(this).hasClass('expandColOne')){
					root.find(".column-link.showLess.columnOne").each(function(i){
						$(this).addClass('showMore');	
					}).first().focus();
				}
				if($(this).hasClass('expandColTwo')){
					root.find(".column-link.showLess.columnTwo").each(function(i){
						$(this).addClass('showMore');
					}).first().focus();
				}
				if($(this).hasClass('expandColThree')){
					root.find(".column-link.showLess.columnThree").each(function(i){
						$(this).addClass('showMore');
					}).first().focus();
				}
				if($(this).hasClass('expandColFour')){
					root.find(".column-link.showLess.columnFour").each(function(i){
						$(this).addClass('showMore');
					}).first().focus();
				}
				if($(this).hasClass('expandColFive')){
					root.find(".column-link.showLess.columnFive").each(function(i){
						$(this).addClass('showMore');
					}).first().focus();
				}
				$(this).hide();
				$(this).next().css('display', 'flex');
			}
		});

		//executed if  "See Less" CTA is clicked
		//collapses list of links in column to hide extra links in that particular column
		// replaces "See Less" CTA with "See More" CTA
		root.find('.collapseInitial').on('click keydown', function(event) {
			if (event.type === 'click' || (event.type === 'keydown' && (event.key === 'Enter' || event.key === ' '))) {
				if($(this).hasClass('collapseColOne')){
					root.find(".column-link.showLess.columnOne").each(function(i){
						$(this).removeClass('showMore');
						
					})
				}
				if($(this).hasClass('collapseColTwo')){
					root.find(".column-link.showLess.columnTwo").each(function(i){
						$(this).removeClass('showMore');
					})
				}
				if($(this).hasClass('collapseColThree')){
					root.find(".column-link.showLess.columnThree").each(function(i){
						$(this).removeClass('showMore');
					})
				}
				if($(this).hasClass('collapseColFour')){
					root.find(".column-link.showLess.columnFour").each(function(i){
						$(this).removeClass('showMore');
					})
				}
				if($(this).hasClass('collapseColFive')){
					root.find(".column-link.showLess.columnFive").each(function(i){
						$(this).removeClass('showMore');
					})
				}
				$(this).hide();
				$(this).prev().css('display', 'flex').focus();
			}
		});

		// Reset defaults for those who enjoy changing the size of their browser while on a page
		$(window).resize(function() {

			//On mobile...
			if((!is5columnfooter && window.innerWidth < 960) ||(is5columnfooter && window.innerWidth < 1280)){
				//expands all links if more than 5 links in columns
				root.find(".column-link.showLess").each(function(i){
					$(this).addClass('showMore');
				})
				root.find('.cmp-fatFooter__column').not(this).addClass('collapsed').removeClass('expanded');
				root.find('.expandInitial').hide();
				root.find('.collapseInitial').hide();
				root.find(".downArrow").css('transform', 'rotate(0deg)');
				root.find(".cmp-fatFooter__initialLinks").hide();
				
			}
			//On desktop...
			else{
				root.find(".cmp-fatFooter__initialLinks").show();
				//hides links 6-10 if more than 5 links in columns
				root.find(".column-link.showLess").each(function(i){
					$(this).removeClass('showMore');
				})
				setSeeMore();
				$('.collapseInitial').hide();
			}
			
		});
});

/*global MyScholastic, window, $*/

$(function () {
	'use strict';
	/*
	 *
	 * My Scholastic Class
	 *
	 */

	/* pull config endpoint in from dom */
	var globalNavRoot = $('#enterprise-globalNav');
	if(globalNavRoot.length) {
		const myScholasticEndpoint = globalNavRoot.find("#myschl-endpoint").attr("myschl-endpoint");
		const myScholasticIframe = globalNavRoot.find(".myschl-modal__iframe");
		const iframeWindow = myScholasticIframe[0].contentWindow;
		const myScholasticModal = globalNavRoot.find(".myschl-modal");
		const myschlModalOverlay = globalNavRoot.find('.myschl-modal__overlay');
		var logoutEndpoint = globalNavRoot.find('#logout-endpoint').attr('logout-endpoint');
		var profileLinksEndpoint = globalNavRoot.find('#links-endpoint').attr('links-endpoint');
		let userFirstName = "";
		let userInitials = "";

		const sps_ud = Cookies.get("SPS_UD");
		if (sps_ud) {
			userFirstName = sps_ud.split('|')[2];
			userInitials = sps_ud.split('|')[2][0] + sps_ud.split('|')[3][0];
		}
		Cookies.set('MYSCHL_referrerUrl', window.location.href, { domain: '.scholastic.com' });

		
		/*
		*
		* My Scholastic Login Functionality
		*
		*/

		var lastScrollTop = 0;

		globalNavRoot.find('.signedInOptions, .globalnav--nav-links').removeClass('hasCampaigns');

		globalNavRoot.find('#signout').click(signout);

		function signout() {
			/* clears SPS_UD and XUS_EI cookies */
			signoutClient()

			//Clear session storage on logout for bookfairs
			sessionStorage.removeItem("bfDestinationLogin");
			sessionStorage.removeItem("bfSelectedFairId");
			
			/*
			* hit myscholastic logout endpoint (for secure cookies)
			* clears SPS_SESSION, SPS_SESSION_SECURE, SPS_TSP, SPS_TSP_SECURE, and SCHL cookies 
			*
			*/
			
			signoutMyScholastic(logoutEndpoint)
		}

		toggleLoggedInUI(false);
		if (!globalNavRoot.parent().hasClass("no-login")) {
			validateLoggedIn(profileLinksEndpoint);
		}

		window.addEventListener("message", (event) => {
			if (event && event.origin === myScholasticEndpoint && iframeWindow === event.source) {
				const { status, data } = JSON.parse(event.data);
				if (status === 'CLOSE') {
					// close the modal
					hideMySchlModal();
				} else if (status === 'SUCCESS' && data !== null) {
					// login user
					const userProfile = data.user.basicProfile;
					userFirstName = userProfile.firstName;
					userInitials = userFirstName[0] + userProfile.lastName[0];
					fetchMyProfileLinks(profileLinksEndpoint);
					hideMySchlModal();
				}
			}
		}, true)

		myschlModalOverlay.click(hideMySchlModal);

		function hideMySchlModal() {
			myScholasticIframe.attr("src", "");
			myScholasticModal.removeClass('open');
			myScholasticModal.hide();
			$("body").removeClass("globalNav__myschl-modal--open");
		}

		function validateLoggedIn(profileLinksEndpoint) {
			if (sps_ud) {
				fetchMyProfileLinks(profileLinksEndpoint)
			} else {
				toggleLoggedInUI(false);
			}
		}

		function fetchMyProfileLinks(profileLinksEndpoint) {
			return fetch(profileLinksEndpoint, {
				method: 'GET',
				credentials: 'include'
			})
			.then((response) => {
				if (response.status === 200) {
					return response.json();
				} else {
					toggleLoggedInUI(false);
					return null;
				}
			})
			.then((data) => {
				/* to be refactored to dynamically populate dropdown links from data object */
				if(data){
					toggleLoggedInUI(true);
					$('.signedInOptions a').remove();
					if(data["#manage-campaigns"]){
						globalNavRoot.find('.signedInOptions, .globalnav--nav-links').addClass('hasCampaigns');
					} else {
						globalNavRoot.find('.signedInOptions, .globalnav--nav-links').removeClass('hasCampaigns');
					}
					$.each(data, function(key, value) {
						if(key == '#my-wishlist') return;
						let profileDropdownItem = '<a id="' + key + '" href="' + value.link + '" tabindex="-1">' + value.label + '</a>';
						$('.signedInOptions').append(profileDropdownItem);
					})

					let profileSignOutItem = '<a id="signout" role="button" aria-label="Sign Out" href="#" tabindex="-1">Sign Out</a>';
					$('.signedInOptions').append(profileSignOutItem);

					globalNavRoot.find('#signout').click(signout);
					if ($(window).width() <= 1050) { resetProfileTabIndex(); }
				}
			})
			.catch((error) => {
				console.log(error);
				return null;
			})
		}

		function toggleLoggedInUI(loggedIn){
			if (loggedIn) {
				globalNavRoot.find('.profileIcon').hide();
				globalNavRoot.find('.globalnav--signedIn').show();

				globalNavRoot.find('#profile-name').text(userFirstName);
				globalNavRoot.find('#profile-initials').text(userInitials);
			} else {
				globalNavRoot.find('.profileIcon').show();
				globalNavRoot.find('.globalnav--signedIn').hide();
			}
		}

		function broadcastLogout() {
			window.postMessage("signout", window.location.origin);
		}

		function signoutClient(){
			const cookieList = ['SPS_UD', 'XUS_EI', 'SPS_SESSION', 'SPS_SESSION_SECURE', 'SPS_TSP', 'SPS_TSP_SECURE'];

			cookieList.forEach(function(cookie) {
				Cookies.remove(cookie, { path: '/', domain: '.scholastic.com' });
			});
		}

		/* clears SPS_SESSION, SPS_SESSION_SECURE, SPS_TSP, SPS_TSP_SECURE, and SCHL cookies */
		function signoutMyScholastic(logoutEndpoint) {
			return fetch(logoutEndpoint, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: "{}"
			})
			.then(response =>  response.json())
			.then(result => {
				broadcastLogout();
				toggleLoggedInUI(false);
			})
			.catch(error => {
				console.error('signoutMyScholastic Error:', error);
			});
		}

		/*
		*
		* Navigation Functionality
		*
		*/

		const rightSideLinksContainer = globalNavRoot.find('.mobile-menu-container');
		if ($(window).width() <= 1050) { rightSideLinksContainer.attr('inert', 'true'); }
		
		function activateOverlay() {
			if ($(window).width() > 1050 && $('.overlay').length === 0) {
				$('header').after('<div class="overlay desktop-only"></div>');
				$('.overlay').show();
				$('.overlay').click(function () {
					closeShop();
					closeProfileLinks();
				});
			}
		}
		
		function deactivateOverlay() {
			if ($(window).width() > 1050 && $('.overlay').length > 0) {
				$('.overlay').remove();
			}
		}

		// Desktop Overlay Binding
		(function () {
			globalNavRoot.find('.globalnav--shop-dropdown, .globalnav--shop-text, .globalnav--signedIn')
			.bind({
				mouseenter: function () {
					closeShop();
					closeProfileLinks();
					// Show signed in options on hover and make them focusable
					if ($(this).closest('.globalnav--signedIn').length) {
						globalNavRoot.find('.signedInOptions').css('display', 'block');
						globalNavRoot.find('.signedInOptions a').attr('tabindex', '0');
					}
					updateProfileTabIndex(); // Ensure profile links are updated
					activateOverlay();
					disableOutsideTabbing();
				},
				mouseleave: function () {
					// Hide signed in options when not hovering and make them unfocusable
					if ($(this).closest('.globalnav--signedIn').length) {
						globalNavRoot.find('.signedInOptions').css('display', 'none');
						globalNavRoot.find('.signedInOptions a').attr('tabindex', '-1');
					}
					updateProfileTabIndex(); // Ensure profile links are updated
					if(!($("body").hasClass("globalnav__menu--open"))){
						deactivateOverlay();
						enableOutsideTabbing();
					}
				}
			});
		})();

		(function () {
			globalNavRoot.find('.profileIcon')
			.bind({
				mouseenter: function () {
					closeShop();
					closeProfileLinks();
					// Show signed out options on hover and make them focusable
					globalNavRoot.find('.signedOutOptions').css('display', 'block');
					globalNavRoot.find('.signedOutOptions a').attr('tabindex', '0');
					updateSignedOutProfileTabIndex(); // Ensure profile links are updated
					activateOverlay();
					disableOutsideTabbing();
				},
				mouseleave: function () {
					// Hide signed out options when not hovering and make them unfocusable
					globalNavRoot.find('.signedOutOptions').css('display', 'none');
					globalNavRoot.find('.signedOutOptions a').attr('tabindex', '-1');
					updateSignedOutProfileTabIndex(); // Ensure profile links are updated
					if(!($("body").hasClass("globalnav__menu--open"))){
						deactivateOverlay();
						enableOutsideTabbing();
					}
				},
				focus: function () {
					closeShop();
					closeProfileLinks();
					// Show signed out options on focus and make them focusable
					globalNavRoot.find('.signedOutOptions').css('display', 'block');
					globalNavRoot.find('.signedOutOptions a').attr('tabindex', '0');
					updateSignedOutProfileTabIndex(); // Ensure profile links are updated
					activateOverlay();
				},
				blur: function(event) {
					// Use requestAnimationFrame for better performance and timing
					requestAnimationFrame(() => {
						const activeElement = document.activeElement;
						const profileContainer = globalNavRoot.find('.profileIcon')[0];
						const signedOutOptions = globalNavRoot.find('.signedOutOptions')[0];
						
						// Check if focus has moved outside the profile area entirely
						// Added null checks for better error handling
						if (profileContainer && signedOutOptions &&
							!profileContainer.contains(activeElement) &&
							!signedOutOptions.contains(activeElement)) {
							// Hide signed out options and make them unfocusable
							globalNavRoot.find('.signedOutOptions').css('display', 'none');
							globalNavRoot.find('.signedOutOptions a').attr('tabindex', '-1');
							updateSignedOutProfileTabIndex();
							deactivateOverlay();
						}
					});
				}
			});
		})();
		
		// Add blur handlers for both sign-in and register links
		(function () {
			globalNavRoot.find('.signedOutOptions-signin, .signedOutOptions-register').bind({
				blur: function(event) {
					// Use requestAnimationFrame for better performance and timing
					requestAnimationFrame(() => {
						const activeElement = document.activeElement;
						const profileContainer = globalNavRoot.find('.profileIcon')[0];
						const signedOutOptions = globalNavRoot.find('.signedOutOptions')[0];
						
						// Check if focus has moved outside the profile area entirely
						// Added null checks for better error handling
						if (profileContainer && signedOutOptions &&
							!profileContainer.contains(activeElement) &&
							!signedOutOptions.contains(activeElement)) {
							// Hide signed out options and make them unfocusable
							globalNavRoot.find('.signedOutOptions').css('display', 'none');
							globalNavRoot.find('.signedOutOptions a').attr('tabindex', '-1');
							updateSignedOutProfileTabIndex();
							deactivateOverlay();
						}
					});
				}
			});
		})();

		// Add blur handlers for signed in profile links
		(function () {
			globalNavRoot.on('blur', '.signedInOptions a', function(event) {
				// Use requestAnimationFrame for better performance and timing
				requestAnimationFrame(() => {
					const activeElement = document.activeElement;
					const signedInContainer = globalNavRoot.find('.globalnav--signedIn')[0];
					const signedInOptions = globalNavRoot.find('.signedInOptions')[0];
					
					// Check if focus has moved outside the signed in area entirely
					// Added null checks for better error handling
					if (signedInContainer && signedInOptions &&
						!signedInContainer.contains(activeElement) &&
						!signedInOptions.contains(activeElement)) {
						// Hide signed in options and make them unfocusable
						globalNavRoot.find('.signedInOptions').css('display', 'none');
						globalNavRoot.find('.signedInOptions a').attr('tabindex', '-1');
						updateProfileTabIndex();
						deactivateOverlay();
					}
				});
			});
		})();

		function openShop() {
			activateOverlay();
			globalNavRoot.find('.globalnav--shop-dropdown').css('display', 'inline-block');
			globalNavRoot.find('.globalnav--shop-text').addClass('open');
			disableOutsideTabbing();
		}

		function closeShop() {
			deactivateOverlay();
			globalNavRoot.find('.globalnav--shop-dropdown').css('display', '');
			globalNavRoot.find('.globalnav--shop-text').removeClass('open');
			enableOutsideTabbing();
		}

		globalNavRoot.find('.globalnav--shop-text').on('click keypress', function (e) {
			if ( (e.which === 13 || e.which === 32) && $(window).width() > 1050) {
				if(globalNavRoot.find('.globalnav--shop-header')[0].matches(":hover")) { return; } // Prevents action if the mouse is not hovering over the shop header
				if (globalNavRoot.find('.globalnav--shop-text').hasClass('open')) {
					closeShop();
				} else {
					openShop();
				}
			}
		});

		var originalTabIndexes = [];
		var tabbingDisabled = false;
		var mobileMenuFocusTrapping = false;

		function disableOutsideTabbing() {
			if (tabbingDisabled) return; // If already disabled, do nothing
			originalTabIndexes = [];
			
			// Get the allowed focusable elements when mobile menu is open
			var mobileMenuContainer = globalNavRoot.find('.mobile-menu-container');
			
			$('body *').each(function () {
				var $this = $(this);
				if ($this.is('a, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') && !$this.hasClass('overlay')) {
			
					var hasMobileTabbableClass = $this.hasClass('mobile-tabbable');
					if (!hasMobileTabbableClass) {
						// Store the original tabindex value (could be undefined, null, or a string)
						var originalTabIndex = $this.attr('tabindex');
						originalTabIndexes.push({ element: $this, tabindex: originalTabIndex });
						$this.attr('tabindex', '-1');
					}
				}
			});
			
			tabbingDisabled = true;
		}

		function enableOutsideTabbing() {
			if (!tabbingDisabled) return; // If not disabled, do nothing
			originalTabIndexes.forEach(function (item) {
				// Restore the original tabindex value
				if (item.tabindex !== undefined && item.tabindex !== null && item.tabindex !== '') {
					// If there was an explicit tabindex value, restore it
					item.element.attr('tabindex', item.tabindex);
				} else {
					// If there was no tabindex attribute originally, remove it completely
					// This allows the element to return to its natural focusability
					item.element.removeAttr('tabindex');
				}
			});
			originalTabIndexes = [];
			tabbingDisabled = false; // Mark tabbing as enabled
		}

		function enableMobileMenuFocusManagement() {
			if (mobileMenuFocusTrapping) return;
			mobileMenuFocusTrapping = true;
			disableOutsideTabbing();
			$(document).on('keydown.mobileMenu', handleMobileMenuKeydown);
			
			// Add focus event listener to catch any focus that escapes
			$(document).on('focus.mobileMenuFocusTrap', function(e) {
				var menuIcon = globalNavRoot.find('.globalnav--menuIcon.mobile-only.opened');
				var mobileMenuContainer = globalNavRoot.find('#mobile-menu');
				// Only allow elements with mobile-tabbable class to be focused
				var menuContainerFocusables = mobileMenuContainer.find('.mobile-tabbable');
				var focusableElements = menuIcon.add(menuContainerFocusables);
				
				var activeElement = $(e.target);
				var isAllowedElement = false;
				
				focusableElements.each(function() {
					if ($(this).is(activeElement)) {
						isAllowedElement = true;
						return false; // break out of each loop
					}
				});

				// If focus landed on a non-allowed element, redirect to menu icon
				if (!isAllowedElement) {
					e.preventDefault();
					e.stopPropagation();
					menuIcon.focus();
				}
			});
		}

		function disableMobileMenuFocusManagement() {
			if (!mobileMenuFocusTrapping) return;
			mobileMenuFocusTrapping = false;
			enableOutsideTabbing();
			$(document).off('keydown.mobileMenu');
			$(document).off('focus.mobileMenuFocusTrap');
		}

		function handleMobileMenuKeydown(e) {
			// Only handle Tab key for focus trapping when mobile menu is open
			if (e.which === 9 && $("body").hasClass("globalnav__menu--open") && $(window).width() <= 1050) {
				trapFocusInMobileMenu(e);
			}
		}

		function trapFocusInMobileMenu(e) {
			// Get the menu icon and focusable elements within the mobile menu container
			var menuIcon = globalNavRoot.find('.globalnav--menuIcon.mobile-only.opened');
			var mobileMenuContainer = globalNavRoot.find('#mobile-menu');
			// Only allow elements with mobile-tabbable class to be focused
			var menuContainerFocusables = mobileMenuContainer.find('.mobile-tabbable');
			
			// Combine menu icon with menu container focusables
			var focusableElements = menuIcon.add(menuContainerFocusables);
			
			if (focusableElements.length === 0) {
				e.preventDefault();
				return;
			}

			var firstFocusable = focusableElements.first(); // Menu icon
			var lastFocusable = focusableElements.last(); // Last element in container
			var activeElement = $(document.activeElement);

			// Check if the currently focused element is in our allowed list
			var isAllowedElement = false;
			focusableElements.each(function() {
				if ($(this).is(activeElement)) {
					isAllowedElement = true;
					return false; // break out of each loop
				}
			});

			// If focus is on a non-allowed element, always redirect to first element
			if (!isAllowedElement) {
				e.preventDefault();
				firstFocusable.focus();
				return;
			}

			// Handle boundary cases for allowed elements
			// If shift+tab on first element (menu icon), go to last element in container
			if (e.shiftKey && activeElement.is(firstFocusable)) {
				e.preventDefault();
				lastFocusable.focus();
			}
			// If tab on last element in container, go to first element (menu icon)
			else if (!e.shiftKey && activeElement.is(lastFocusable)) {
				e.preventDefault();
				firstFocusable.focus();
			}
			// For all other cases within the allowed elements, let normal tab behavior work
		}

		// Makes mobile nav slide out from the left
		function openNav() {
			$('.mobile-dark-overlay').show();
			globalNavRoot.find('.globalnav--menuIconImg').attr('src', '/content/dam/corp-home/asset.jpg/icons/close.svg');
			globalNavRoot.find('.globalnav--nav-links, .signedInOptions, .mobile-menu-container, .profileIcon').animate({left: '0px'}, 250);
			globalNavRoot.find('.globalnav--menuIcon').removeClass('closed').addClass('opened').addClass('mobile-tabbable');
			$("body").addClass("globalnav__menu--open");
			$('.mobile-dark-overlay').show();
			// Focus on the profileIcon which is the first mobile-tabbable element after the menu icon
			globalNavRoot.find('.profileIcon').focus();
			enableMobileMenuFocusManagement();
			if ($(window).width() <= 1050) { rightSideLinksContainer.removeAttr('inert'); }
		}

		// Make mobile nav slide into the left
		function closeNav() {
			globalNavRoot.find('.globalnav--nav-links, .signedInOptions, .mobile-menu-container, .profileIcon').animate({left: '-320px'}, 250);
			globalNavRoot.find('.globalnav--menuIcon').removeClass('opened').addClass('closed').removeClass('mobile-tabbable');
			globalNavRoot.find('.globalnav--menuIconImg').attr('src', '/content/dam/corp-home/asset.jpg/icons/hamburger.svg');
			$('.mobile-dark-overlay').hide();
			$("body").removeClass("globalnav__menu--open");
			disableMobileMenuFocusManagement();
			// Return focus to the menu icon after closing
			globalNavRoot.find('.globalnav--menuIcon').focus();
			if ($(window).width() <= 1050) { rightSideLinksContainer.attr('inert', true); }
		}

		// Closes the nav without animation for screen resizes
		function closeNavUnanimated() {
			globalNavRoot.find('.globalnav--nav-links, .signedInOptions').css('left', '');
			globalNavRoot.find('.mobile-menu-container').css('left', '-320px');
			globalNavRoot.find('.globalnav--menuIcon').removeClass('opened').addClass('closed').removeClass('mobile-tabbable');
			globalNavRoot.find('.globalnav--menuIconImg').attr('src', '/content/dam/corp-home/asset.jpg/icons/hamburger.svg');
			$('.mobile-dark-overlay').hide();
			$("body").removeClass("globalnav__menu--open");
			disableMobileMenuFocusManagement();
			if ($(window).width() <= 1050) { rightSideLinksContainer.attr('inert', true); }
		}
		
		function expandSignInOptions() {
			globalNavRoot.find('img.arrow-down-dark').css('transform', 'rotate(180deg)');
			globalNavRoot.find('.signedInOptions').addClass('expanded').removeClass('collapsed').removeClass('mobile-tabbable');
			var signInHeight = globalNavRoot.find('.signedInOptions').outerHeight();
			globalNavRoot.find('.globalnav--nav-links').animate({top: signInHeight.toString() + 'px'}, 250);
		}

		function collapseSignInOptions() {
			globalNavRoot.find('img.arrow-down-dark').css('transform', 'rotate(0deg)');
			globalNavRoot.find('.globalnav--nav-links').animate({top: '55px'}, 250, function() {
				globalNavRoot.find('.signedInOptions').addClass('collapsed').removeClass('expanded');
			});
		}

		$('.mobile-dark-overlay').click(closeNav);
		
		// When I click on the menu Icon, show and hide the menu
		globalNavRoot.find('.globalnav--menuIcon').on('click keypress', function (e) {
			if ( (e.which === 13 || e.type === 'click') && $(window).width() <= 1050) {
				if (globalNavRoot.find('.globalnav--menuIcon').hasClass('closed')) {
					openNav();
				} else if (globalNavRoot.find('.globalnav--menuIcon').hasClass('opened')) {
					closeNav();
				}
			}
		});

		// When I click the options pane that appears when signed in, expand/collapse
		globalNavRoot.find('.signedInOptions').click(function () {
			if (globalNavRoot.find('.signedInOptions').hasClass('collapsed')) {
				expandSignInOptions();
			} else if (globalNavRoot.find('.signedInOptions').hasClass('expanded')) {
				collapseSignInOptions();
			}
		});

		globalNavRoot.find('.greeting').on('click keypress', function (e) {
			if (e.which === 13 && $(window).width() <= 1050) {
				if (globalNavRoot.find('.signedInOptions').hasClass('collapsed')) {
					expandSignInOptions();
				} else if (globalNavRoot.find('.signedInOptions').hasClass('expanded')) {
					collapseSignInOptions();
				}
			}
		});

		if ($(window).width() > 1050) { globalNavRoot.find('.greeting').attr('tabindex', '-1'); }

		globalNavRoot.find('.signedInCircle').on('click keypress', function (e) {
			if (e.which === 13 && $(window).width() > 1050) {
				const signedInOptions = globalNavRoot.find('.signedInOptions');
				if (globalNavRoot.find('.globalnav--signedIn')[0].matches(":hover")) { return; }
				const currentDisplay = signedInOptions.css('display');
				if (currentDisplay === 'none') {
					openProfileLinks();
				} else {
					closeProfileLinks();
				}
			}
		});

		function updateProfileTabIndex() {
			if ($(window).width() <= 1050) return; // No need to update tabIndex on mobile
			const isHidden = globalNavRoot.find('.signedInOptions').css('display') === "none"; // Check if menu is hidden
			const links = globalNavRoot.find('.signedInOptions a');
			links.each(function () {
				this.tabIndex = isHidden ? -1 : 0;
			});
		}

		function updateSignedOutProfileTabIndex() {
			if ($(window).width() <= 1050) return; // No need to update tabIndex on mobile
			const isHidden = globalNavRoot.find('.signedOutOptions').css('display') === "none"; // Check if menu is hidden
			const links = globalNavRoot.find('.signedOutOptions a');
			links.each(function () {
				this.tabIndex = isHidden ? -1 : 0;
			});
		}

		function resetProfileTabIndex() {
			const links = globalNavRoot.find('.signedInOptions a');
			links.each(function () {
				this.tabIndex = 0; // Reset tabIndex to 0 for all links
			});
		}

		function closeProfileLinks() {
			if($(window).width() > 1050) {
				deactivateOverlay();
				enableOutsideTabbing();
				globalNavRoot.find('.signedInOptions').css('display', 'none');
				globalNavRoot.find('.signedOutOptions').css('display', 'none');
				
				// Ensure hidden elements cannot receive focus
				globalNavRoot.find('.signedInOptions a, .signedOutOptions a').attr('tabindex', '-1');
				updateProfileTabIndex();
				updateSignedOutProfileTabIndex();
			}
		}
		
		function openProfileLinks() {
			if($(window).width() > 1050) {
				activateOverlay();
				disableOutsideTabbing();
				globalNavRoot.find('.signedInOptions').css('display', 'block');
				globalNavRoot.find('.signedOutOptions').css('display', 'block');
				
				// Restore focus capability for visible elements
				globalNavRoot.find('.signedInOptions a, .signedOutOptions a').attr('tabindex', '0');
				updateProfileTabIndex();
				updateSignedOutProfileTabIndex();
			}
		}

		$(document).keydown(function(e) {
			if (e.which === 27) { // Check if the Escape key was pressed
				if (globalNavRoot.find('.globalnav--shop-text').hasClass('open')) {
					closeShop();
				}
				if (globalNavRoot.find('.globalnav--menuIcon').hasClass('opened')) {
					closeNav(); // Use closeNav() instead of closeNavUnanimated() for better UX
				}
				if (globalNavRoot.find('.signedInOptions').css('display') !== 'none' && !globalNavRoot.find('.globalnav--signedIn')[0].matches(":hover")) {
					closeProfileLinks();
				}
			}
		});

		function reorderSignIn() {
			const container = globalNavRoot.find('.mobile-menu-container')[0];
			if (!container) return;
		
			const children = Array.from(container.children);
			const desktopView = $(window).width() > 1050;
			const currentOrder = container.getAttribute('data-order');
		
			if (desktopView && currentOrder !== 'desktop') {
				children.reverse().forEach(child => container.appendChild(child));
				container.setAttribute('data-order', 'desktop');
			} else if (!desktopView && currentOrder !== 'mobile') {
				children.reverse().forEach(child => container.appendChild(child));
				container.setAttribute('data-order', 'mobile');
			}
		}
		
		$(document).ready(function () {
			const container = globalNavRoot.find('.mobile-menu-container')[0];
			if (container) { container.setAttribute('data-order', 'desktop');}
			reorderSignIn();
			
			// Initialize dropdown elements as hidden and unfocusable
			globalNavRoot.find('.signedInOptions, .signedOutOptions').css('display', 'none');
			globalNavRoot.find('.signedInOptions a, .signedOutOptions a').attr('tabindex', '-1');
			
			updateProfileTabIndex();
			updateSignedOutProfileTabIndex();
		});
		
		$(window).resize(function () {
			closeShop();
			closeProfileLinks();
			reorderSignIn();
			if ($(window).width() > 1050) {
				closeNavUnanimated();
				closeShop();
				rightSideLinksContainer.removeAttr('inert');
				// Removing jQuery applied inline styles
				globalNavRoot.find('.signedInOptions').css('display', '');
				globalNavRoot.find('.signedOutOptions').css('display', '');
				globalNavRoot.find('.profileIcon').css('left', '');
				$('.mobile-dark-overlay').css('display', '');
				$('header').css('top', '0');
				$('header').css('position', 'relative');
				globalNavRoot.find('.greeting').attr('tabindex', '-1');
			} else {
				resetProfileTabIndex();
				$('header').css('position', 'fixed');
				closeShop();
				if ($("body").hasClass("globalnav__menu--open")) {
					disableOutsideTabbing();
					rightSideLinksContainer.removeAttr('inert');
				}
				else {
					enableOutsideTabbing();
					rightSideLinksContainer.attr('inert', true);
				}
				globalNavRoot.find('.greeting').attr('tabindex', '0');
			}
		});

		// Watches for scroll and displays menu on scroll
		$(window).scroll(function () {
			if ($(window).width() <= 1050) {
				var st = $(this).scrollTop();
				$('header').css('position', 'fixed');
				if (st > lastScrollTop) {
					// downward scroll
					if (st <= $('header').height()) {
						$('header').css('top', 0 - st);
					} else {
						$('header').css('top', 0 - $('header').height());
					}
				} else {
					// upward scroll
					$('header').css({
						'top' : '0'
					});
				}
				lastScrollTop = st;
			}
		});
	}
});

(function ($) {
	'use strict';

	var globalNav = $('#enterprise-globalNav');
	var profileIcon = globalNav.find('.profileIcon');
	var signIn = globalNav.find('.signedOutOptions-signin');
	var register = globalNav.find('.signedOutOptions-register');
	var myschlModal = globalNav.find('.myschl-modal');
	var myScholasticEndpoint = $('#myschl-endpoint').attr('myschl-endpoint');
	const myScholasticReferrer = $("#myschl-endpoint").attr("myschl-referrer");
	var myscholasticIframe = globalNav.find('.myschl-modal__iframe');
	profileIcon.on('click', {event_type : 'signin'}, showMySchlModal);

	function bindActivate($el, event_type) {
		$el.on('click keydown', { event_type }, function (e) {
			const isClick = e.type === 'click';
			const isActivateKey =
				e.type === 'keydown' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.which === 13 || e.which === 32);

			if (isClick || isActivateKey) {
				e.preventDefault();
				e.stopPropagation();
				showMySchlModal(e);
			}
		});
	}

	bindActivate(profileIcon, 'signin');
	bindActivate(signIn, 'signin');
	bindActivate(register, 'register');

	function showMySchlModal(event) {
		if(event.data.event_type == 'register') {
			myscholasticIframe.attr("src", myScholasticEndpoint.concat(`/my-scholastic/register/my-info.html?ref=${myScholasticReferrer || "corphome"}`));
		}
		else {
			myscholasticIframe.attr("src", myScholasticEndpoint.concat(`/my-scholastic/sign-in.html?ref=${myScholasticReferrer || "corphome"}`));
		}
		event.stopPropagation();
		myschlModal.addClass('open');
		myschlModal.show();
		$("body").addClass("globalNav__myschl-modal--open");
	}

}(jQuery));
$(document).ready(function () {
	'use strict';
	let tabsArray = $('.tabs').toArray();

	tabsArray.forEach((el) => {
		linkTabs(el);
	})

	function linkTabs(root) {
		let tabs = $(root);
		let tabTitle = tabs.find('.tabs__tab-bar-title');
		let tabExplore = tabs.find('.tabs__explore');

		tabTitle.click(function () {
			let thisTabs = $(this).closest('.tabs');
			let thisTabsBar = thisTabs.find('.tabs__tab-bar');
			let thisTabsTitles = thisTabs.find('.tabs__tab-bar-title');
			let thisTabsSlide = thisTabs.find('.tabs__slide');
			let currOptionalChildVideoIframeContainer;
			let currOptionalChildVideoIframe;

			/* Locate current displayed video in tab if exists */
			thisTabsSlide.each(function(idx, element) {
				if($(element).css('display') === 'block'){
					currOptionalChildVideoIframeContainer = $(element).find('.cmp-video__container');
					currOptionalChildVideoIframe = $(element).find('.cmp-video__player');
					return false;
				}
			});

			/* Stop play when tabbing away from video in progress */
			if(currOptionalChildVideoIframeContainer && currOptionalChildVideoIframe){

				//list of videos in playlist that was playing
				let currentPlaylist_videos = $(".playlist__current-video");

				currentPlaylist_videos.each(video =>{	
					//find the video that was playing
					if($(currentPlaylist_videos[video]).hasClass("vjs-playing")){
						//function defined in playlist.js
						pauseVideo(video);
						
					}
				})
				let iframeClone = currOptionalChildVideoIframe.clone();
				currOptionalChildVideoIframe.remove();
				currOptionalChildVideoIframeContainer.append(iframeClone);
			}

			/* Reset Defaults */
			thisTabsTitles.removeClass("tabs__tab-bar--selected");
			thisTabsSlide.hide();
			
			$(this).addClass("tabs__tab-bar--selected");
			let tabNum = thisTabsTitles.index(this);
			thisTabsSlide.eq(tabNum).show();
			
			
			if ($(window).width() < 720) {
				thisTabsBar.slideToggle('medium', function() {
					if ($(this).is(':visible'))
						$(this).css('display','inline-block');
				});
			}
			
			// Necessary to fix playlist overlapping
			$(window).trigger('resize');
		})
		
		tabExplore.click(function () {
			let thisTabs = $(this).closest('.tabs');
			let thisTabsBar = thisTabs.find('.tabs__tab-bar');
			thisTabsBar.slideToggle('medium', function() {
				if ($(this).is(':visible'))
					$(this).css('display','inline-block');
			});
		})
	}
});

/* Normalize on Window Resize */
$(window).resize(function() {
	if ($(window).width() > 720) {
		$('.tabs__tab-bar').css('display', 'inline-flex');
	}else{
		$('.tabs__tab-bar').hide();
	}
});


/* Enter key to trigger click for ADA */
$(".tabs__tab-bar-title").keydown(function(e){
	if(e.which === 13){
		$(this).click();
	}
});

$(".tabs__explore").keydown(function(e){
	if(e.which === 13){
		$(this).click();
	}
});
$(document).ready(function () {
	let playlists = $(".playlist")
	if (playlists.length) {
		// Video.js Styles
		let videojsStyles = document.createElement("link")
		videojsStyles.setAttribute("href", "//vjs.zencdn.net/8.16.1/video-js.css")
		videojsStyles.setAttribute("rel", "stylesheet")
		// Video.js Script
		let videojsScript = document.createElement("script")
		videojsScript.setAttribute("src", "//vjs.zencdn.net/8.16.1/video.min.js")

		document.head.append(videojsStyles)
		document.body.append(videojsScript)
		videojsScript.addEventListener("load", initializePlaylists, false)
	}

    const ROOT_URL = 'https://content.uplynk.com';
    const UPLYNK_URI = '/player/playlists';
    
    
    function encodeArray(args) {
        if (!Array.isArray(args) && typeof args !== 'object') return false;
        let c = 0;
        let out = '';
        for (const [name, value] of Object.entries(args)) {
            if (c++ !== 0) out += '&';
            out += encodeURIComponent(name) + '=';
            if (Array.isArray(value)) {
                out += encodeURIComponent(JSON.stringify(value));
            } else {
                out += encodeURIComponent(value);
            }
        }
        return out + '\n';
    }

    async function fetchData(uri, channelId) {
        let msg = {
            uri: UPLYNK_URI,
            identifier: channelId
        };
         console.log("uri", uri);
        const body = JSON.stringify(msg);
        console.log("JSON input to servlet", body);
        //const body = encodeArray({ msg });
        let response = await fetch(uri, {
                                     method: 'POST',
                                     headers: {
                                     'Content-Type': 'application/json',
                                     },
                                     body: body,
                                     });
        let jsondata = await response.json();
        if(jsondata.error == 1)
        console.log("Error fetching video response");
        return jsondata;
    }

    function initializePlaylists() {
		playlists.each(function (index) {
			// Set playlist ID
			let playlist = $(this)
			let channelId = playlist.find(".cmp-playlist__container").data("channel-id")
            console.log('channelId', channelId);
			let videoId = `playlist_${index}`
			let currentVideo = playlist.find(".playlist__current-video")
			currentVideo.attr("id", videoId)
			
			// Retrieve playlist info from Uplynk API
            console.log('sendng request to servlet');

			fetchData('/bin/enterprise/uplynkapirequest',channelId ).then(data => {
				let videoObjects = []
                //console.log('data', data);
				// Extract URLs and relevant data from playlist response
				for (let video of data.items) {

					let videoUrl = undefined;
					let videoPreviewImage = video.poster_url.replace("http://", "https://");
					//let videoThumbnailImage = video.thumb_url.replace("http://", "https://");
                    //let externalId = video.external_id;

					let videoSrcType = 'application/x-mpegURL';
					let videoDescription = '';
					// Creates video object with extracted data
					if(typeof video.meta !== "undefined" && video.meta.description != 'None' && video.meta.description != null) {
						videoDescription = video.meta.description;
					}
					videoObjects.push({
						title: video.desc,
						description: videoDescription,
						previewImage: videoPreviewImage,
						thumbnailImage: videoPreviewImage,
						duration: video.duration*1000,
                        videoUrl: "https://content.uplynk.com/ext/3504f582aff348f7af5d95c5e50bdc9d/" + video.external_id + ".m3u8",
						srcType: videoSrcType
					})
				}
				// Initialize video player with first video
				currentVideo.children("source").attr("src", videoObjects[0].videoUrl)
				currentVideo.children("source").attr("type", videoObjects[0].srcType);
				currentVideo.attr("poster", videoObjects[0].previewImage)
				currentVideo.next(".playlist__current-video-title").text(videoObjects[0].title)
				currentVideo.nextAll(".playlist__current-video-description").text(videoObjects[0].description)

				let player = videojs(videoId, {
					aspectRatio: "16:9"
				})

				// Insert whisper mark in video player
				let whisperContainer = $("<div class='playlist__video-whisper-mark'></div>")
				let whisperIcon = "<img class='playlist__whisper-mark-icon' src='/content/dam/enterprise/asset.jpg/video/brand-scholastic-logo-whisper-bar.svg'/>"
				let whisperParagraph = `<p class='playlist__whisper-text'>${videoObjects[0].title}</p>`
				whisperContainer.append(whisperIcon, whisperParagraph)
				currentVideo.find('.vjs-control-bar').append(whisperContainer)

				let videoCarousel = playlist.find(".playlist__video-carousel")

				// Function that loads corresponding video when clicked
				function clickVideoCard(i) {
					$(this).closest(".playlist__video-carousel").find(".playlist__video-card--active").removeClass("playlist__video-card--active")
					$(this).addClass("playlist__video-card--active")

					player.src({ type: videoObjects[i].srcType, src: videoObjects[i].videoUrl })
					player.poster(videoObjects[i].previewImage)
					currentVideo.find(".playlist__whisper-text").text(videoObjects[i].title)
					currentVideo.next(".playlist__current-video-title").text(videoObjects[i].title)
					currentVideo.nextAll(".playlist__current-video-description").text(videoObjects[i].description)
					player.play()
				}

				// Generate video cards which are then inserted into the
				// carousel
				for (let i = 0; i < videoObjects.length; i++) {
					let videoCard = $("<button type='button' class='playlist__video-card'></button>")
					let thumbnail = `<img class="playlist__video-card-thumbnail" width="120" height="68" src="${videoObjects[i].thumbnailImage}" alt=""/>`
					let playButton = '<img class="playlist__thumbnail-play-button" width="37" height="36" src="/content/dam/enterprise/asset.jpg/video/play-button-small.svg" alt=""/>';
					let overlay = '<div class="playlist__thumbnail-overlay"></div>'
					let minutes = Math.trunc(videoObjects[i].duration / 60000)
					let seconds = Math.trunc(videoObjects[i].duration / 1000) % 60
					let durationFormat = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`
					let durationElement = `<p class="playlist__video-card-duration">${durationFormat}</p>`
					let nowPlaying = '<p class="playlist__video-card-duration playlist__video-card-duration--now-playing">Now Playing</p>'
					let title = `<p class="playlist__video-card-title"><span class="playlist__video-title-text">${videoObjects[i].title}</span></p>`
					videoCard.append(overlay, playButton, thumbnail, durationElement, nowPlaying, title)
					videoCarousel.append(videoCard)
				}
				// Set first video as active
				videoCarousel.children(":first-child").addClass("playlist__video-card--active")

				let backgroundColor = playlist.find('.playlist__background-authored-color').get(0).getAttribute('backgroundcolor');
				if (!backgroundColor){
					backgroundColor = "#FFFFFF";
				}
				let darkBackground = isBackgroundDark(backgroundColor);

				let nextArrowElement = '<button class="playlist__carousel-button playlist__carousel-button--next" type="button"><img alt="Next" src="/content/dam/enterprise/asset.jpg/carousel/carousel-next-arrow.svg"/></button>';
				let prevArrowElement = '<button class="playlist__carousel-button playlist__carousel-button--prev" type="button"><img alt="Previous" src="/content/dam/enterprise/asset.jpg/carousel/carousel-prev-arrow.svg"/></button>';

				if (darkBackground){
					// add class to lighten text
					playlist.addClass('textColorOverride');
					// change arrows to lighter icons
					nextArrowElement = '<button class="playlist__carousel-button playlist__carousel-button--next" type="button"><img alt="Next" src="/content/dam/enterprise/asset.jpg/carousel/carousel-next-arrow-dark-background.svg"/></button>';
					prevArrowElement = '<button class="playlist__carousel-button playlist__carousel-button--prev" type="button"><img alt="Previous" src="/content/dam/enterprise/asset.jpg/carousel/carousel-prev-arrow-dark-background.svg"/></button>';
				}

				// Slick (initialize) the carousel
				videoCarousel.slick({
					slidesToShow: 7,
					slidesToScroll: 7,
					variableWidth: true,
					infinite: false,
					nextArrow: nextArrowElement,
					prevArrow: prevArrowElement,
					responsive: [
						{
							breakpoint: 1600,
							settings: {
								slidesToShow: 5,
								slidesToScroll: 5
							}
						},
						{
							breakpoint: 1280,
							settings: {
								slidesToShow: 4,
								slidesToScroll: 4
							}
						},
						{
							breakpoint: 960,
							settings: {
								// There better not be any playlists that have
								// more than 100 videos
								// (This allows me to disable the carousel
								// functionality without destroying slick)
								slidesToShow: 100,
								slidesToScroll: 100,
								arrows: false
							}
						}
					]
				})

				// When the carousel has overflow, it becomes focusable for some
				// reason, probably for accessibility
				// However, this functionality is unnecessary since all the
				// cards are tabbable
				videoCarousel.find('.slick-track').attr('tabindex', '-1')

				// Attaching click handlers to all video cards
				videoCarousel.find(".playlist__video-card").click(function () {
					let index = $(this).closest(".slick-slide").data("slick-index")
					clickVideoCard.call(this, index)
				})

				// When the prev/next buttons are clicked, deactivate slides on
				// previous page, so they cannot be tabbed
				videoCarousel.on('afterChange', function (event, slick, currentSlide) {
					$(this).find(".slick-slide").slice(0, currentSlide).removeClass("slick-active")
				})

				let carouselGradient = '<div class="playlist__carousel-gradient"></div>'

				// Set background and gradient to authored color
				if (backgroundColor) {
					carouselGradient = `<div class="playlist__carousel-gradient" style="background-color: transparent; background-image: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, ${backgroundColor})"></div>`;
					// set background color of containers, adjusts text color
					// from dark to light if necessary
					playlist.find('.cmp-playlist__container').attr('style', `background-color: ${backgroundColor}`);
					playlist.find('.playlist__video-card').attr('style', `background-color: ${backgroundColor}`);
				}

				// When a breakpoint is hit, append carousel gradient, reattach
				// click handlers to video cards,
				// and add tabindex attribute to carousel (see above)
				videoCarousel.on('breakpoint', function (event, slick, breakpoint) {
					$(this).append(carouselGradient)
					// set background color of containers after new breakpoint
					$(this).find('.cmp-playlist__container').attr('style', `background-color: ${backgroundColor}`);
					$(this).find('.playlist__video-card').attr('style', `background-color: ${backgroundColor}`);
					$(this).find(".playlist__video-card").click(function () {
						let index = $(this).closest(".slick-slide").data("slick-index")
						clickVideoCard.call(this, index)
					})
					$(this).find('.slick-track').attr('tabindex', '-1')
				})

				// After video ends, launch next video
				player.on("ended", function () {
					let activeVideoCard = videoCarousel.find(".playlist__video-card--active").closest(".slick-slide")
					let nextVideoCard = activeVideoCard.next().find(".playlist__video-card")
					// Advance carousel if the end of the row has been reached
					if (nextVideoCard.attr("tabindex") === "-1") {
						videoCarousel.find(".playlist__carousel-button--next").click()
					} else if (typeof nextVideoCard[0] !== 'undefined') {
						let totalWidth = activeVideoCard.width() + parseInt(activeVideoCard.css("margin-right"))
						let index = activeVideoCard.data("slick-index")
						let newVideoPosition = totalWidth * (index + 1)
						videoCarousel.find(".slick-track")[0].scrollTo({ top: 0, left: newVideoPosition, behavior: 'smooth' })
					}
					nextVideoCard.click()
				})

				videoCarousel.append(carouselGradient)
			 })
		})
	}


})

// Uses Web3C guidelines to evaluate readability
// https://www.w3.org/TR/WCAG20/#contrast-ratiodef
function isBackgroundDark(backgroundColor) {
	let hexNum = backgroundColor.slice(1);

	// relative luminance, value from 0.0 - 1.0, darkest -> lightest
	let foregroundLum = calculateRelativeLuminance('555555');
	let backgroundLum = calculateRelativeLuminance(hexNum);
	let darker = foregroundLum;
	let lighter = backgroundLum;

	// if background darker than foreground, switch
	if (backgroundLum < foregroundLum){
		darker = backgroundLum;
		lighter = foregroundLum;
	}

	// calculate contrast ratio
	let contrastRatio = (lighter + .05) / (darker + .05);
	if (contrastRatio <= 4.5){
		return true;
	}else{
		return false;
	}
}

// Uses Web3C guidelines to calculate relative luminance
// https://www.w3.org/TR/WCAG20/#relativeluminancedef
function calculateRelativeLuminance(hexColor){
	// convert hex to RGB color codes
	let redRgb = parseInt(hexColor.slice(0,2), 16) / 255;
	let greenRgb = parseInt(hexColor.slice(2,4), 16) / 255;
	let blueRgb= parseInt(hexColor.slice(4), 16) / 255;

	var r = (redRgb <= 0.03928) ? redRgb/12.92 : Math.pow((redRgb+0.055)/1.055, 2.4);
	var g = (greenRgb <= 0.03928) ? greenRgb/12.92 : Math.pow((greenRgb+0.055)/1.055, 2.4);
	var b = (blueRgb <= 0.03928) ? blueRgb/12.92 : Math.pow((blueRgb+0.055)/1.055, 2.4);

	let l = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
	return l
}

// Pauses video of given index in the playlist, function can be called from
// other files
function pauseVideo(index) {
	let player = videojs(`playlist_${index}`)
	player.pause();
}
/** This function runs automatically after a Limelight player is
 *  initialized and the media is loaded. Used to replace the default
 *  video thumbnail and background color
 */
/*function limelightPlayerCallback(playerId, eventName, _data) {
    if (eventName === "onMediaLoad") {
        let player = $(`#${playerId}`)
        let data = player.parent().data()
        let thumbnail = data.thumbnail
        let backgroundColor = data.backgroundColor
        let poster = player.find(".vjs-poster")
        if (thumbnail) {
            poster.css("background-image", `url('${thumbnail}')`)
        }
        poster.parent().css("background-color", backgroundColor)
        poster.css("background-color", backgroundColor)
        poster.addClass("visible")
    }
 }

$(document).ready(function () {

    // Load all Limelight videos and add custom features
    function initLimelightVideos() {
        limelightVideos.each(function() {
            let playerId = $(this).attr("id")
            let videoId = $(this).data("video-id")
            LimelightPlayerUtil.embed({
                playerId: playerId,
                mediaId: videoId,
                playerForm: "Player",
                height: "100%",
                width: "100%"
            })
        })
        // Need to repeat selector because limelightVideos get overridden
        $(".video .limelight-player").each(function() {
            // Overwriting CSS
            $(this).css("position", "absolute")
            // Adding new play button
            let playButton = $("<img>").attr({
                "src": "/content/dam/enterprise/asset.jpg/video/play-button.svg",
                "alt": "Play",
                "width": "116",
                "height": "117"
            }).addClass("play-button")
            $(this).find(".vjs-limelight-big-play").append(playButton)
        })
    }

    let limelightVideos = $(".video .limelight-player")
    if (limelightVideos.length) {
        // Set player IDs
        limelightVideos.each(function(index) {
            let playerId = "limelight_player_" + index
            $(this).attr("id", playerId)
        })
        // Append Limelight script to body
        let limelightScript = document.createElement("script")
        limelightScript.setAttribute("src", "https://video.limelight.com/player/limelightjs-player.js?orgId=8381499cf4be495e91f418caa5e94115")
        document.body.appendChild(limelightScript)
        limelightScript.addEventListener("load", initLimelightVideos, false)
    }
})*/


//Dom Load Check
document.addEventListener('DOMContentLoaded', () => {

//Find limelight embeds    
const limelightEmbed = document.querySelectorAll(".limelight-player");    
    
    //If limelight embeds exist on page
    if (limelightEmbed.length) {

    //Set up variables    
    const upLynkStyle = document.createElement('link');  
    const upLynkscript = document.createElement('script');    
    let newVideoJsPlayer;    
    let limelightMediaId;
    let newVideoEmbed;
    let newVideoEmbedSource;   
    let newVideoEmbedTrack;    
    let uplynkPosterUrl;    

    //Call video.js css / js files    
    upLynkStyle.rel = "stylesheet";
    upLynkStyle.type = "text/css";
    upLynkStyle.href = "https://vjs.zencdn.net/8.16.1/video-js.css"; 
    upLynkscript.type = 'text/javascript';    
    upLynkscript.src = 'https://vjs.zencdn.net/8.16.1/video.min.js';  
    document.head.appendChild(upLynkStyle);
    document.head.appendChild(upLynkscript);         
        
    //Loop through limelight embeds
	for(let i = 0; i < limelightEmbed.length; i++) {
        
    //Set existing limelight video ID's   
    limelightMediaId = limelightEmbed[i].getAttribute("data-video-id");    
    //limelightMediaId = "715c3a3a48a845b394e9955fa62e4bb5";   

    //Set alt text
    altText = limelightEmbed[i].getAttribute("alt-text");
      
        
    //Grab uplynk video JSON    
    fetch("https://content.uplynk.com/player/assetinfo/ext/3504f582aff348f7af5d95c5e50bdc9d/" + limelightMediaId + ".json")
      .then(response => response.json())
      .then(data => {
    
      //Set up video JS tag
      newVideoEmbed = document.createElement('video');
      newVideoEmbed.id = "video-js-player_" + i;
      newVideoEmbed.className = 'video-js';
      newVideoEmbed.setAttribute("poster",data.poster_url);
      newVideoEmbed.setAttribute("alt", altText);
    //   set alt attribute
      newVideoEmbed.controls = true;  


      //Set up video JS source tag    
      newVideoEmbedSource = document.createElement('source');  
      newVideoEmbedSource.src = "https://content.uplynk.com/ext/3504f582aff348f7af5d95c5e50bdc9d/" + data.external_id + ".m3u8"; 
      newVideoEmbedSource.type = 'application/x-mpegURL';   
      newVideoEmbed.appendChild(newVideoEmbedSource) 

      /*Set up video JS track tag    
      newVideoEmbedTrack = document.createElement('track'); 
      newVideoEmbedTrack.setAttribute("kind","caption");  
      newVideoEmbedTrack.setAttribute("srclang","en");
      newVideoEmbedTrack.setAttribute("label","English"); 
      newVideoEmbedTrack.src = data.thumb_prefix + data.asset + "_e.mp4_transcript_cc1.vtt"; 
      newVideoEmbed.appendChild(newVideoEmbedTrack); */    

      //Replace limelight markup with video.js markup    
      limelightEmbed[i].replaceWith(newVideoEmbed);

      //Initialize the video js players    
      newVideoJsPlayer = videojs(newVideoEmbed.id, {"fluid": true});  
                 
      })
      .catch(error => {
        // Handle errors here
        console.error('Error fetching video data:', error);
      });
        
	}
  }
})
$(document).ready(function () {
	let forms = $('.wufoo-form');
	if (forms.length) {
		// Set Wufoo.js Script
		let wufooScript = document.createElement("script");
		wufooScript.setAttribute("src", 'https://secure.wufoo.com/scripts/embed/form.js');
		document.body.append(wufooScript);
		
		// Load forms after Script is added to DOM
		wufooScript.addEventListener("load", initializeForms, false);
	}

	function initializeForms(){
		forms.each(function (){
			// Set Form ID
			let formId = $(this).attr('formId');
			// Set Form Options
			options = { 
				userName: 'scholastic',
				formHash: formId,
				autoResize: true,
				height: '1032',
				async: true,
				host: 'wufoo.com',
				header: 'show',
				ssl: true
			};
			let wufooForm = new WufooForm();
			wufooForm.initialize(options);
			wufooForm.display(); 
		});
	};
});


$(document).ready(function () {
	let accordions = $(".cmp-accordion")
	accordions.each(function (index) {
		let root = $(this);
		root.find('.cmp-accordion__column').on('keypress click', function (e) {
			if (e.which === 13 || e.type === 'click') {
				if ($(this).hasClass('expanded')) {
					$(this).removeClass('expanded');
					$(this).addClass('collapsed');
				}else if ($(this).hasClass('collapsed')) {
					$(this).removeClass('collapsed');
					$(this).addClass('expanded');
				}
			}
		});
	});
});
$(document).ready(function () {
    //Don't initialize slick in author
    if(!Granite.author && $(".heroCarousel").length > 0) {
        
        var slickScript = document.getElementById('slickscript')
        
        slickScript.addEventListener("load", initializeHeroCarousel, false)
        
        function initializeHeroCarousel() {
            //get all carousels on page
            var heroCarouselArray = $(".heroCarousel").toArray();

            //link jquery to separate carousel roots to encapsulate styles
            heroCarouselArray.forEach(function(el){
                var heroCarousel = $(el);
                var heroCarouselContent = heroCarousel.find('.cmp-carousel__content');
                $(heroCarouselContent).each(function () {
                    let carouselWidth = $(this).outerWidth();
                    let windowWidth = $(window).width();
                    let autoPlayBoolean = ($(this).closest('.cmp-carousel').attr('data-cmp-autoplay') !== undefined);
                    $(this).slick({
                        dots: true,
                        arrows: true,
                        autoplay: autoPlayBoolean,
                        nextArrow: '<button class="slideCarousel__arrow--right slick-next" aria-label="Press this button to move to the next carousel slide"><span><svg width= "11px" fill="white" height= "20px"><title>Carousel Right Button</title><path d="M 0.49925 20.0002 C 0.37125 20.0002 0.24425 19.9513 0.14625 19.8533 C -0.04875 19.6583 -0.04875 19.3423 0.14625 19.1462 L 9.29225 10.0002 L 0.14625 0.85325 C -0.04875 0.65825 -0.04875 0.34225 0.14625 0.14625 C 0.34125 -0.04875 0.65825 -0.04875 0.85325 0.14625 L 10.1412 9.43425 C 10.2922 9.58525 10.3752 9.78625 10.3752 10.0002 C 10.3752 10.2142 10.2922 10.4152 10.1412 10.5662 L 0.85325 19.8533 C 0.75525 19.9513 0.62725 20.0002 0.49925 20.0002 L 0.49925 20.0002 Z"/></svg></span></button>',
                        prevArrow: '<button class="slideCarousel__arrow--left slick-prev" aria-label="Press this button to move to the previous carousel slide"><span><svg width= "11px" fill="white" height= "20px"><title>Carousel Left Button</title><path d="M 9.876 20.0002 C 10.004 20.0002 10.131 19.9513 10.229 19.8533 C 10.424 19.6583 10.424 19.3423 10.229 19.1462 L 1.083 10.0002 L 10.229 0.85325 C 10.424 0.65825 10.424 0.34225 10.229 0.14625 C 10.034 -0.04875 9.717 -0.04875 9.522 0.14625 L 0.234 9.43425 C 0.083 9.58525 2.57572e-14 9.78625 2.57572e-14 10.0002 C 2.57572e-14 10.2142 0.083 10.4152 0.234 10.5662 L 9.522 19.8533 C 9.5955 19.9268 9.68587 19.9727 9.78047 19.9911 L 9.876 20.0002 Z"/></svg></span></button>'
                    });
                });
            })
        }
    }
});

(function ($) {
	'use strict';
	//get all subNavs on page
	var megaNavArray = $(".megaNav.carousel").toArray();
	//link jquery to separate subNav roots to encapsulate styles (such that clicking/editing one subNav will not affect another)
	megaNavArray.forEach(function (el) {
		initializeMegaNav(el);
	})

	function initializeMegaNav(root) {
		var megaNav = $(root);
		var megaNavMobileMenu = megaNav.find('.megaNav__mobileMenu');
		var megaNavItems = megaNav.find('.megaNav__items');
		var megaNavOverlay = megaNav.find('.megaNav__overlay');
		var megaNavX = megaNav.find('.megaNav__X');
		var megaNavItemArray = (megaNav.find(".megaNav__item")).toArray();

		var originalTabIndexes = [];
		var tabbingDisabled = false;
		var sidebarOpen = false;

		if ( window.innerWidth < 1279 ) { megaNavItems.attr('inert', 'true'); }

		function disableOutsideTabbing() {
			if (tabbingDisabled) return; // If already disabled, do nothing
			originalTabIndexes = [];
			$('body *').each(function () {
				var $this = $(this);
				if (($this.is('a, button, [href], input, select, textarea, [tabindex], img, p') && !$this.closest(megaNavItems).length)) {
					originalTabIndexes.push({ element: $this, tabindex: $this.attr('tabindex') });
					$this.attr('tabindex', '-1');
				}
			});
			tabbingDisabled = true;
		}
		function enableOutsideTabbing() {
			if (!tabbingDisabled) return; // If not disabled, do nothing
			originalTabIndexes.forEach(function (item) {
				if (item.tabindex !== undefined) {
					item.element.attr('tabindex', item.tabindex);
				} else {
					item.element.removeAttr('tabindex');
				}
			});
			originalTabIndexes = [];
			tabbingDisabled = false; // Mark tabbing as enabled
		}

		// When I click the hamburger menu, open sidebar
		megaNavMobileMenu.on('keypress click', function (e) {
			if (e.which === 13 || e.type === 'click') {
				megaNavItems.animate({
					left: '0'
				}, 250);
				megaNavOverlay.show();
				// Disable scroll
				$('html, body').css({
					overflow: 'hidden'
					, height: '100%'
				});
				if ( window.innerWidth < 1279 ) { megaNavItems.removeAttr('inert'); }
				sidebarOpen = true;
				disableOutsideTabbing();
			}
		});

		function closeSideBar() {
			if(!sidebarOpen) return;

			megaNavItems.animate({
				left: '-299'
			}, 250);
			megaNavOverlay.hide();
			// Enable scroll
			$('html, body').css({
				overflow: 'initial'
				, height: 'initial'
			});
			if ( window.innerWidth < 1279 ) { 
				megaNavItems.attr('inert', 'true'); 
			}
			sidebarOpen = false;
			enableOutsideTabbing();
		};

		// When I click the X, close sidebar
		megaNavX.on('keypress click', function (e) {
			if (e.which === 13 || e.type === 'click') {
				closeSideBar();
			}
		});
		// When I click a link that contains sublinks, expand/hide them
		megaNavItemArray.forEach(function (el) {
			expandNavItem(el);
		})

		function expandNavItem(root) {
			var navItem = $(root);
			var navChildren = navItem.find('.megaNav__expanded')
			var arrow = navItem.find('.megaNav__arrow');
			navItem.on( "mouseenter", function() {
				if ( window.innerWidth >= 1279 ) {
					if (navChildren.length !== 0) {
						// Check if child has "clicked" style already if it doesnt then clear existing clicked dropdowns 
						if(navChildren[0].style.display !== "grid"){
							$('.megaNav__expanded').attr('style', '');
						}
						navChildren.addClass('megaNav__component--dropdown__hovered');
					}
					else{
						// Single items hovered, clear all expanded views
						$('.megaNav__expanded').attr('style', '');
					}
				}
			})
			navItem.on( "mouseleave", function() {
				if ( window.innerWidth >= 1279 ) {
					if (navChildren.length !== 0){
						navChildren.removeClass('megaNav__component--dropdown__hovered');
					} 
				}
			})
			navItem.on('keypress click', function (e) {
				if (e.which === 13 || e.type === 'click') {
					if (navChildren.length !== 0) {
						navChildren.toggle();
						arrow.toggleClass("megaNav__arrow—flipped");
						if ( window.innerWidth >= 1279 ) {
							// Close any open items
							$('.megaNav__expanded').attr('style', '');
							// Show particular item
							navChildren.css('display', 'grid');
						}
					}
				}
			});
		}
		// Reset properties when re-sizing the screen
		$(window).on("resize", function () {
			if ( window.innerWidth >= 1279 ) {
				// hide any open nav items
				$('.megaNav__expanded').attr('style', '');
				// reset any flipped up arrows
				$('.cmp-megaNav--arrow').removeClass('megaNav__arrow—flipped');
				// enable scroll
				$('html, body').css({
					overflow: 'initial'
					, height: 'initial'
				});
				megaNavItems.removeAttr('inert');
				closeSideBar();
			}
			else {
				megaNavItems.attr('inert', 'true');
			}
		})
		// Hide all dropdowns when clicked outside of entire meganav
		$(document).mouseup(function(e){
			if (!megaNav.is(e.target) && megaNav.has(e.target).length === 0) 
			{
				if ( window.innerWidth >= 1279 ) {
					$('.megaNav__expanded').attr('style', '');
				}
			}
		});
		$(document).keydown(function(e) {
			if (e.which === 27) { // Check if the Escape key was pressed
				if ( window.innerWidth >= 1279 ) {
					$('.megaNav__expanded').attr('style', '');
				} else {
					closeSideBar();
				}
			}
		});
	}
}(jQuery));

$(function () {
	'use strict';
	
	var articleRoot = $('#enterprise-articleHead');
    if(articleRoot.length) {

		/**
		 * Set the publish date
		 */
        // Get the publishDate attribute
        var dateString = articleRoot.find('#publishDate').attr('publishDate') || '';

        // Parse the date string
        var parts = dateString !== '' ? dateString.split("-") : [];
        var date = new Date(parts[2], parts[1] - 1, parts[0]);

        function getOrdinalSuffix(day) {
            if (day % 10 == 1 && day != 11) {
                return day + "st";
            } else if (day % 10 == 2 && day != 12) {
                return day + "nd";
            } else if (day % 10 == 3 && day != 13) {
                return day + "rd";
            } else {
                return day + "th";
            }
        }
        // Format the date
        var dayWithSuffix = getOrdinalSuffix(date.getDate());
        var formattedDate = date.toLocaleDateString("en-US", { month: 'long' }) + " " + dayWithSuffix + ", " + date.getFullYear();

        $('#publishDate').text(formattedDate);


        let tagContainer = articleRoot.find('.articleHead-articleTags__container');
        const tagsFromContainer = tagContainer.attr('tags');
        let tagList = tagsFromContainer ? tagsFromContainer.split(",") : [];
        displaytags(tagList);

        function displaytags(tags){
			
            const articleTagsList = tags.map((tagCurrent) => {
		
				let articleTagBreakdown = tagCurrent.split(":");
				let tag =  articleTagBreakdown[articleTagBreakdown.length - 1]
				if(articleTagBreakdown.length == 2 && articleTagBreakdown[1] == ''){
					tag = articleTagBreakdown[0];
				}
				const articleTag = 
				`
                    <p class="articleHead-articleTags">${tag}</p>
				`;
				return articleTag;
				
			});
		// append tags to tag container
		tagContainer.append(...articleTagsList);			
		}
 
    }
});

$(document).ready(function () {

	(async function(){
	const articleFeedElements = Array.from($('.article_feed'));
	//Used to find if its the last article feed component on the page to determine if the lastCall parameter should be true
	let order = 0;
	//Iterates through each article feed component on the page
	for (const articleFeedElement of articleFeedElements) {
		order +=1;
        const articleFeedRoot = $(articleFeedElement);
		const params = new URLSearchParams(window.location.search);

		//Level is used to determine the depth of the article feed component on the page
		const level = articleFeedRoot.attr('level');
		const container = articleFeedRoot.find(`.article-feed__container${level}`);

		//Generated Feed Specific

		const isCategoryPage = new URL(window.location.href).pathname.includes("/newsroom/category-page");
		
		//Tag option is used to determine if the tagList is a query parameter or a static list
		const tagOption = container.attr('tagoption');
		let tagList = []
		if( tagOption === "query"){
			tagList =  isCategoryPage ? (params.get(`tag`) || "all").toLowerCase() : (params.get(`tag${level}`) || "all").toLowerCase();
		}else{
			tagList = container.attr('tagList');
		}   
	
		//Articles to exclude is a list of articles that should not be displayed in the article feed
		const articlesToExclude = container.attr('exclude') ?(container.attr('exclude')).split(",") : [];

		//Internal offset is used to determine how many articles have been excluded from the feed
		//This is used to determine the correct offset for the next call to the article feed servlet
		let internalOffset = articlesToExclude.length;

		//Offset is used to determine the starting point of the article feed
		const offset = container.attr('offset') || '0';


		//IsPaginated is used to determine if the article feed component should be paginated
		const isPaginated = articleFeedRoot.attr('ispaginated') === "true" ? true : false;
		const pageNumInput = $(`.pagination__page-input${level}`);
		let pageNum = parseInt(params.get(`pageNum`)) || 1;
		pageNumInput.val(pageNum);


		//Curated Feed Specific
		const isCurated = container.attr('curatedArticles') !== undefined ? true : false;
		const curatedArticles = container.attr('curatedArticles');
			

			
		//Original limit is used to determine the original limit of the article feed component before any articles are excluded
		//This is used to account for articles that were selected to be excluded from feed but were not returned in the servlet call
		const originalLimit = isCurated ? 0 : parseInt(container.attr('limit'));

		//Limit is used to determine how many articles should be displayed in the article feed
		const limit = (isPaginated ? 0 : originalLimit + internalOffset)|| 0;

		//Directory path is used to determine the root directory of the article feed component if tagsOptions is set to query
		//If no tag is included in the query parameter, the article feed servlet will return all articles in the directory up to the limit
		let directoryPath = "/content"
		if( tagOption && tagOption === "query"){
			directoryPath =  container.attr('directoryPath')
		}

	
		//Check if feed is for podcasts
		let resourceQuery= "enterprise/components/structure/article/articleHead";
		let isPodcastFeed = false ;
		if( articleFeedRoot.attr('isPodcastFeed') === "true"){
			isPodcastFeed = true;
			resourceQuery = "news/components/structure/podcastHead";
		}

		//Single Article Specific
		let isSingleArticle = false;
		if(isCurated){
			if(curatedArticles.split(',').length === 1){
				container.addClass('singleArticle');
				isSingleArticle = true;
			}	
		}else{
			isSingleArticle = limit === 1;
		}
		const lastCall = (articleFeedElements.length > order ? false : true);

		//Initializes feedList (Output from servlet not changed), totalHits, and numOfPages
		let feedList = [];
		let totalHits =  0;
		let numOfPages = Math.ceil(totalHits / originalLimit);

		// Makes call to servlets based on if the article feed is curated or generated
		if(isCurated){
			await loadCuratedArticles();
		}else{
			await loadGeneratedArticles();
		}
		
		//Function to make call to article feed servlet for curated articles
		async function loadCuratedArticles(){
			try{
				const response = await fetch(
					`/bin/enterprise/articlecuratedfeedservlet
					?lastCall=${lastCall}
					&articleList=${curatedArticles}
					&resourceQuery=${resourceQuery}`
				);
				const data = await response.json();
		
				
				if (data !== null ) {
					if(data.hits.length > 0){
						await setFeedList(data.hits);
					}
					
				}
			}catch(error) {
				console.error('Error accessing article homepage endpoint:', error);
			};
		}

		//Function to make call to article feed servlet for generated articles
		async function loadGeneratedArticles(){
			try{
				const response = await fetch(
					`/bin/enterprise/articlefeedservlet
					?limit=${limit}
					&offset=${offset}
					&tag=${tagList}
					&lastCall=${lastCall}
					&directoryPath=${directoryPath}
					&resourceQuery=${resourceQuery}`
				);
				const data = await response.json();
				if (data !== null ) {
					if(data.hits.length > 0){
						await setFeedList(data.hits);
					}
					
				}
			}catch(error) {
				console.error('Error accessing article homepage endpoint:', error);
			};
		}


		//Pagination functionality for article feed component

		//Page change based on back arrow click
		$(`.pagination__backArrow-available-btn${level}`).click(async function() {
			if (!isPaginated) return;
			let input = $(`.pagination__page-input${level}`);
			let currentValue = parseInt(input.val(), 10);
			input.val(currentValue - 1);
			pageNum = currentValue - 1;
			//Display articles based on the new page number
			await displayArticles(feedList)
			//Scroll to top of article feed
			$(`.firstInFeed${level}`)[0].scrollIntoView({ block: 'start', inline: 'nearest' });
			window.scrollBy(0, -100); 
		});
		//Page change based on forward arrow click
		$(`.pagination__forwardArrow-available-btn${level}`).click(async function() {
			if (!isPaginated) return;
			let input = $(`.pagination__page-input${level}`);
			let currentValue = parseInt(input.val(), 10);
			input.val(currentValue + 1);
			pageNum = currentValue + 1;
			//Display articles based on the new page number
			await displayArticles(feedList)
			//Scroll to top of article feed
			$(`.firstInFeed${level}`)[0].scrollIntoView({ block: 'start', inline: 'nearest' });
			window.scrollBy(0, -100); 
		});
		//Page change based on input
		$(`.pagination__page-input${level}`).change(async function() {
			if (!isPaginated) return;
			let newValue = parseInt($(this).val(), 10);
			if (isNaN(newValue) || newValue < 1 || newValue > numOfPages) {
				$(this).val(pageNum);
			} else {
				pageNum = newValue;
				//Display articles based on the new page number
				await displayArticles(feedList)
				//Scroll to top of article feed
				$(`.firstInFeed${level}`)[0].scrollIntoView({ block: 'start', inline: 'nearest' });
				window.scrollBy(0, -100); 
			}
		});

		//Function to set the feedList based on the articles returned from the servlet
		async function setFeedList(articles){
			//limitAfterExclude is used to determine the limit of the article feed component before articles have been excluded
			//As we iterate through the articles, we will increment the limitAfterExclude if an article is excluded
			//This is to ensure that the correct number of articles are displayed in the article feed component 
			let limitAfterExclude = originalLimit;
			articles = articles.filter(article => {
				if (articlesToExclude.includes(article.path)) {
					limitAfterExclude++;
					return false;
				}
				return true;
			});
			feedList = (isPaginated || isCurated )? articles : articles.slice(0, limitAfterExclude);	
			totalHits = articles.length;
			numOfPages = Math.ceil(totalHits / originalLimit);
			await displayArticles(feedList);
		}

		//Function to display articles in the article feed component
		async function displayArticles(articles){
			$('#pagination__total-pages').text(numOfPages);
			//Hide pagination arrows if there is only one page
			if(numOfPages === 1){
				$(`.pagination__forwardArrow-available-btn${level}`).hide();
				$(`.pagination__backArrow-available-btn${level}`).hide();
				$('.pagination__forwardArrow-unavailable').show();
				$('.pagination__backArrow-unavailable').show();
			//Hide back arrow if on first page
			}else if(pageNum === 1){
				$(`.pagination__backArrow-available-btn${level}`).hide();
				$('.pagination__backArrow-unavailable').show();
				$(`.pagination__forwardArrow-available-btn${level}`).show();
				$('.pagination__forwardArrow-unavailable').hide();
			//Hide forward arrow if on last page
			}if(pageNum === numOfPages && numOfPages > 1){
				$(`.pagination__forwardArrow-available-btn${level}`).hide();
				$('.pagination__forwardArrow-unavailable').show();
				$(`.pagination__backArrow-available-btn${level}`).show();
				$('.pagination__backArrow-unavailable').hide();
			//Show both arrows if in the middle of the pages
			}else if(pageNum > 1 && pageNum < numOfPages){
				$(`.pagination__forwardArrow-available-btn${level}`).show();
				$('.pagination__forwardArrow-unavailable').hide();
				$(`.pagination__backArrow-available-btn${level}`).show();
				$('.pagination__backArrow-unavailable').hide();
			}
		
			//Calculate the first and last article indexes on the page based on page number
			let firstOnPage = 0;
			let lastOnPage = articles.length;
			if(isPaginated){
				firstOnPage = (pageNum-1) * originalLimit;
				lastOnPage =  firstOnPage + originalLimit > totalHits ? totalHits : firstOnPage + originalLimit;
			}
			
			//Clear the article feed component
			container.empty();

			//Iterate through articles on current page and create article cards
			const articleCards = articles.slice(firstOnPage, lastOnPage).map((article, index) => {
				let formattedDate = "";

				//Format date to be displayed on article card
				if(article.articlePublishDate){
					const date = new Date(article.articlePublishDate.year, article.articlePublishDate.month, article.articlePublishDate.dayOfMonth);
					const options = { year: 'numeric', month: 'long', day: 'numeric' };
					formattedDate = date.toLocaleDateString('en-US', options);
				}

				//Breakdown tag to get the last tag in the list
				let articleTagBreakdown = article.articleTags ? article.articleTags[0].split(":") : [];
				let articleTag= articleTagBreakdown[articleTagBreakdown.length - 1]
				if(articleTagBreakdown.length == 2 && articleTagBreakdown[1] == ''){
					articleTag = articleTagBreakdown[0];
				}

				//Check if article is a podcast or article feed and assign default image
				let placeHolderImagePath = isPodcastFeed ? "/content/dam/newsroom/scholastic-reads-podcast/ScholasticReads-800x450.png" : "/content/dam/enterprise/asset.jpg/articlefeed_placeholder.png";
				const articleCard = 
				`
					<div class="news-article__card ${isSingleArticle ? "singleArticle" : "" } ${index === 0 ? `firstInFeed${level}` : ""} " title="${article.articleTitle}">
						<a class="news-article__link ${isSingleArticle ? "singleArticle" : "" } " href=${window.location.origin}${article.path}.html>
							<div class="news-article__content-container ${isSingleArticle ? "singleArticle" : "" }">
								<div class="news-article__cover-container ${isSingleArticle ? "singleArticle" : "" }">
									${article.articleImage ? `<img class="news-article__cover--image ${isSingleArticle ? "singleArticle" : "" }" src="${article.articleImage}">` : `<img class="news-article__cover--image ${isSingleArticle ? "singleArticle" : "" }" src=${placeHolderImagePath}>`}
								</div>
								<div class="news-article__text-container  ${isSingleArticle ? "singleArticle" : "" }">
									<p class="news-article__title">${article.articleTitle}</p>
									${article.articlePublishDate ? `<p class="news-article__publishDate">${formattedDate} </p>` : ''}
									<div class="news-article__tag-container">
										${isPodcastFeed ? `<p class="news-article__tag">Scholastic Reads Podcast</p>` : `${article.articleTags ? `<p class="news-article__tag">${articleTag}</p>` : ''}` }
									</div>
								</div>
							</div>
						</a>
					</div>
				
				`;
				return articleCard;
				
			});
		// append card to articlefeed component
		container.append(...articleCards);			
		}
	}
})();
})
$(document).ready(function () {
	'use strict';
	let verticalTabsArray = $('.verticalTabs').toArray();

	verticalTabsArray.forEach((el) => {
		linkTabs(el);
	})

	function linkTabs(root) {
		let verticalTabs = $(root);
		let tabContainer = verticalTabs.find('.vertical-tabs__container');
		let tabTitle = tabContainer.find('.vertical-tabs__tab-bar-title');
		let mobileTabContainer = verticalTabs.find('.vertical-tabs__container--mobile');
		let mobileTabTitle = mobileTabContainer.find('.vertical-tabs__tab-bar-title');

		// set first navigation item as selected
		tabContainer.find('.vertical-tabs__tab-bar-title').first().addClass("vertical-tabs__tab-bar--selected");
		mobileTabContainer.find('.vertical-tabs__tab-bar-title').first().addClass("vertical-tabs__tab-bar--selected");

		let modalOverlay = verticalTabs.find('.vertical-tabs-modal__overlay');
		modalOverlay.click(function () {
			closeModal(verticalTabs);
		})

		tabTitle.click(function () {
			let thisTabsTitles = verticalTabs.find('.vertical-tabs__tab-bar-title');
			let thisTabsSlide = verticalTabs.find('.vertical-tabs__slide');
			let currOptionalChildVideoIframeContainer;
			let currOptionalChildVideoIframe;

			/* Locate current displayed video in tab if exists */
			thisTabsSlide.each(function(idx, element) {
				if($(element).css('display') === 'block'){
					currOptionalChildVideoIframeContainer = $(element).find('.cmp-video__container');
					currOptionalChildVideoIframe = $(element).find('.cmp-video__player');
					return false;
				}
			});

			/* Stop play when tabbing away from video in progress */
			if(currOptionalChildVideoIframeContainer && currOptionalChildVideoIframe){

				//list of videos in playlist that was playing
				let currentPlaylist_videos = $(".playlist__current-video");

				currentPlaylist_videos.each(video =>{   
					//find the video that was playing
					if($(currentPlaylist_videos[video]).hasClass("vjs-playing")){
						//function defined in playlist.js
						pauseVideo(video);
					}
				})
				let iframeClone = currOptionalChildVideoIframe.clone();
				currOptionalChildVideoIframe.remove();
				currOptionalChildVideoIframeContainer.append(iframeClone);
			}

			/* Reset Defaults */
			thisTabsTitles.removeClass("vertical-tabs__tab-bar--selected");
			thisTabsSlide.css('display','none');
			
			$(this).addClass("vertical-tabs__tab-bar--selected");
			let tabNum = thisTabsTitles.index(this);
			thisTabsSlide.eq(tabNum).css('display','block');
			
			// Necessary to fix playlist overlapping
			$(window).trigger('resize');
		})

		// Link Mobile Buttons
		let mobileMenuClose = verticalTabs.find('.vertical-tabs-modal__close-icon');

		// close modal
		mobileMenuClose.click(function() {
			closeModal(verticalTabs);
		})

		let collapsedMenuTitle = verticalTabs.find('.vertical-tabs__authorable-menu-bar');
		// link mobile menu header expand options
		collapsedMenuTitle.click(function() {
			openModal(verticalTabs);
		})

		mobileTabTitle.click(function () {
			let mobileTabContainer = verticalTabs.find('.vertical-tabs__container--mobile');
			let thisMobileTabsTitles = mobileTabContainer.find('.vertical-tabs__tab-bar-title');
			let thisTabsSlide = verticalTabs.find('.vertical-tabs__slide');
			let currOptionalChildVideoIframeContainer;
			let currOptionalChildVideoIframe;

			/* Locate current displayed video in tab if exists */
			thisTabsSlide.each(function(idx, element) {
				if($(element).css('display') === 'block'){
					currOptionalChildVideoIframeContainer = $(element).find('.cmp-video__container');
					currOptionalChildVideoIframe = $(element).find('.cmp-video__player');
					return false;
				}
			});

			/* Stop play when tabbing away from video in progress */
			if(currOptionalChildVideoIframeContainer && currOptionalChildVideoIframe){

				//list of videos in playlist that was playing
				let currentPlaylist_videos = $(".playlist__current-video");

				currentPlaylist_videos.each(video =>{   
					//find the video that was playing
					if($(currentPlaylist_videos[video]).hasClass("vjs-playing")){
						//function defined in playlist.js
						pauseVideo(video);
					}
				})
				let iframeClone = currOptionalChildVideoIframe.clone();
				currOptionalChildVideoIframe.remove();
				currOptionalChildVideoIframeContainer.append(iframeClone);
			}
			
			/* Reset Defaults */
			thisMobileTabsTitles.removeClass("vertical-tabs__tab-bar--selected");
			thisTabsSlide.css('display','none');
			
			// show slide
			$(this).addClass("vertical-tabs__tab-bar--selected");
			let tabNum = thisMobileTabsTitles.index(this);
			thisTabsSlide.eq(tabNum).css('display','block');
			
			// close modal
			closeModal(verticalTabs);
			
			// Necessary to fix playlist overlapping
			$(window).trigger('resize');
		})

		function trapFocus(e){
			// Select focusable elements
			const focusableElements = mobileTabContainer[0].querySelectorAll('li, img');
			const firstFocusableElement = focusableElements[0];
			const lastFocusableElement = focusableElements[focusableElements.length - 1];

			const isTabPressed = e.key === 'Tab';
			  
			if (!isTabPressed) {
			  return;
			}
		  
			if (e.shiftKey) { // Shift + Tab
			  if (document.activeElement === firstFocusableElement) {
				lastFocusableElement.focus();
				e.preventDefault();
			  }
			} else { // Tab
			  if (document.activeElement === lastFocusableElement) {
				firstFocusableElement.focus();
				e.preventDefault();
			  }
			}
		}
	
		function openModal(context){
			// Open Modal
			mobileTabContainer.animate({
				left: '0'
			}, 250);
			let thisOverlay = context.find('.vertical-tabs-modal__overlay');
			thisOverlay.css("display", "block");
			// Disable scroll
			$('html, body').css({
				overflow: 'hidden'
				, height: '100%'
			});

			// Make mobile elements selectable
			let mobileTabs = mobileTabContainer.find('li');
			let closeModalButton = mobileTabContainer.find('img');
			closeModalButton.attr('tabIndex', '0');
			mobileTabs.attr('tabIndex', '0');
			// Trap focus
			document.addEventListener('keydown', trapFocus);
		}

		function closeModal(context){
			mobileTabContainer.animate({
				left: '-301'
			}, 250);
			let thisOverlay = context.find('.vertical-tabs-modal__overlay');
			thisOverlay.css("display", "none");
			// Enable scroll
			$('html, body').css({
				overflow: 'initial'
				, height: 'initial'
			});

			// Make mobile elements unselectable
			let mobileTabs = mobileTabContainer.find('li');
			let closeModalButton = mobileTabContainer.find('img');
			closeModalButton.attr('tabIndex', '-1');
			mobileTabs.attr('tabIndex', '-1');
			// Untrap focus
			document.removeEventListener('keydown', trapFocus);
		}
	}
});

/* Enter key to trigger click for ADA */
$(".vertical-tabs__tab-bar-title").keydown(function(e){
	if(e.which === 13){
		$(this).click();
	}
});

$(".vertical-tabs__explore").keydown(function(e){
	if(e.which === 13){
		$(this).click();
	}
});

/* Enter key to trigger click for ADA */
$(".vertical-tabs-modal__close-icon").keydown(function(e){
	if(e.which === 13){
		$(this).click();
	}
});

$(".vertical-tabs__authorable-menu-bar").keydown(function(e){
	if(e.which === 13){
		$(this).click();
	}
});

$(document).ready(function(){
	
	const linkSelectors = [".button",".labelTextLink",".label", ".heading", ".image", ".subNav", ".text", ".megaNav"];
	const textSelectors = new Set([".heading", ".text", ".subNav", ".megaNav"]);

	function removeWhitespace(str) {
		const newStr = str.toString().trim();
		// Replaces whitespace inside string with dashes
		return newStr.replace(/\s/g, "-"); 
	}

	linkSelectors.forEach(function(selector){
		// For each selector
		$(selector).each(function() {
			// Get the analytics-section-id of its closest responsivegrid parent
			const analyticsSectionID = $(this).closest("[analytics-section-id]").attr("analytics-section-id");
			// Update the data-element-linkname to the analytics-section-id + the selected link's title
			const links = $(this).find("a").toArray();

			links.forEach(function(link){

				const linkElement = $(link);
				let title = "";

				if (textSelectors.has(selector)) {
					title = linkElement.text();
				}
				else {
					title = linkElement.attr("data-element-linkname");
				}

				let dataElementLinkname = analyticsSectionID + "-" + title;
				// Removes whitespace from analytics attribute
				dataElementLinkname = removeWhitespace(dataElementLinkname);

				linkElement.attr("data-element-linkname", dataElementLinkname);
			})
		});
	})
}); 
$(document).ready(function(){
	//If Readium JS not on current page, load Readium bundle
	if(!window.Reader) {
		$.getScript("/etc/designs/scholastic/enterprise/clientlibs/reader/bundle.reader.js");
	}

	//Get endpoint for the current environment's appropriate S3 bucket so that we may access ePub files
	if($('[ereader-uid]').length > 0){
		fetch('/bin/eReaderServlet')
			.then(response => response.json())
			.then(data => initializeEreaders(data.s3Endpoint))
			.catch((error) => {
				console.error('Error Initializing eReader:', error);
			});
	}

	function initializeEreaders(s3Endpoint) {
		//Iterating through every element on the page with an authored eReader path
		$('[ereader-uid]').each(function(){
			let ePubPath = $(this).attr('ereader-uid')
		
			//Initializing eReader configuration and attaching to click handler
			let eReaderConfiguration = {
				pathToReader: "/etc/designs/scholastic/enterprise/clientlibs/reader/index.html",
				epub: s3Endpoint + ePubPath,
				errorPage: "/etc/designs/scholastic/enterprise/clientlibs/reader/error.html",
				syntheticSpread: 'spread'
			};
			
			let eReaderOverride = {
				"documentTitle":"Presentation View",
				"autoHideFullscreen":false,
				"plugins":[
					{
						"name":"zoom",
						"options":{
							"showZoomIn":true,
							"showZoomOut":true,
							"showFit":true,
							"showZoomSelection":false
						}
					},
					{
						"name":"toc",
						"options":{
							"enabled":true
						}
					},
				]
			}
	
			let reader = new Reader(eReaderConfiguration, ePubPath, eReaderOverride)
	
			$(this).click(function(e) {
				e.preventDefault()
				reader.open()
			})
		})
	}
});
(function (document, $) {
	"use strict";

	let selectWrapper;
	let toggleRightAlign;
	let selectList;

	$(document).on("foundation-contentloaded", function (e) {
		//grab parent of icon selector to access both the selectionList and checkbox-toggle
		selectWrapper = $(".cq-dialog-button-icon-selector").closest(".coral-FixedColumn-column");
		toggleRightAlign = $(selectWrapper).find(".cq-dialog-hidden-toggle-right-align");
		selectList = $(".cq-dialog-button-icon-selector").find(".coral-SelectList");
	});	

	//set right arrow on selection
	$(document).on("selected", ".cq-dialog-button-icon-selector", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//re-set right arrow when title is edited
	$(document).on("change", ".cq-dialog-button-title", function (e) {
		iconSelectionHandler(selectList,toggleRightAlign);
	});

	//this logic triggers a click on hidden checkbox toggle right aligned
	//icon in button.html when a right arrow icon is selected
	function iconSelectionHandler(listElement,toggleElement) {
		let currentSelection = listElement.find("[aria-selected='true']").html();
		//if right arrow is selected, trigger click on hidden toggle
		toggleElement.each(function (i, element) {
			if($(element).is("coral-checkbox")) {
				// handle Coral3 base drop-down
				Coral.commons.ready(element, function (component) {
					if(currentSelection === 'Arrow Right'){
						component.trigger('click');
					}
				});
			} else {
				// handle Coral2 based drop-down
				var component = $(element).data("checkbox");
				if(currentSelection === 'Arrow Right'){
					component.trigger('click');
				}
			}
		})
	}
})(document, Granite.$);
