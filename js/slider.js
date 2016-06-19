/**
 * Simple slider widget
 *
 * HTML markup :
 *    <div id="mySlider" class="slider"></div>
 * Use :
 *    var mySlider = new slider('mySlider', 'Slider label', 350, function (value) { console.log(value); }, .5, 10, 3.2, 1);
 *
 * @param {string} id - Slider element id
 * @param {string} label - Slider label
 * @param {int} rangeWidth - Range element width
 * @param {function} onChangeFunction - Callback called on value change
 * @param {number} [minVal=1] - Range minimum value
 * @param {number} [maxVal=100] - Range maximum value
 * @param {number} [val=50] - Current value
 * @param {int} [decimals=0] - Number of decimals
 *
 * @author cosmicmac / https://github.com/cosmicmac
 * @see http://stackoverflow.com/questions/14095880/simple-pure-javascript-drag-controller-slider
 * @version 1.1 20160605
 */
var slider = function (id, label, rangeWidth, onChangeFunction, minVal, maxVal, val, decimals) {

    var self = this;

    this.down = false;


    // ** Get container element **

    this.slider = document.getElementById(id);


    // ** Add label element **

    this.label = document.createElement("label");
    this.slider.appendChild(this.label);
    this.label.innerHTML = label;


    // ** Add slider and dragger elements **

    this.dragger = document.createElement("span");
    this.range   = document.createElement("div");
    this.range.appendChild(this.dragger);
    this.slider.appendChild(this.range);

    this.range.style.width = rangeWidth + "px";
    this.rangeWidth        = rangeWidth;


    // ** Add input element **

    this.input = document.createElement("input");
    this.slider.appendChild(this.input);

    this.input.type = "text";


    // ** Event handlers **

    this.label.addEventListener('mousedown', function (e) {
        e.preventDefault();
    });

    this.label.addEventListener('click', function (e) {
        e.preventDefault();
        self.resetValue();
        onChangeFunction(self.value);
    });

    this.input.addEventListener('change', function () {
        self.value = Math.min(self.maxVal, Math.max(self.minVal, this.value));
        self.update();
        onChangeFunction(self.value);
    });

    this.range.addEventListener("mousedown", function (e) {
        e.preventDefault();
        self.down = true;
        if (!self.rangeLeft) {
            // Getting rangeLeft in the constructor is not possible
            // if the element is not displayed on document load
            self.rangeLeft = getOffset(self.range).left + document.body.scrollLeft;
        }
        updateDragger(e);
        return false;
    });

    document.addEventListener("mousemove", function (e) {
        e.preventDefault();
        if (self.down)
            updateDragger(e);
    });

    document.addEventListener("mouseup", function () {
        self.down = false;
    });


    // ** Init values **

    this.init(minVal, maxVal, val, decimals);


    // ** Helpers **

    function updateDragger(e) {
        if (self.down && e.pageX >= self.rangeLeft && e.pageX <= (self.rangeLeft + self.rangeWidth)) {
            self.dragger.style.left = e.pageX - self.rangeLeft + 'px';
            self.value              = self.input.value = Math.round(((e.pageX - self.rangeLeft) * self.rangeUnit + self.minVal) * self.decimals) / self.decimals;
            onChangeFunction(self.value);
        }
    }

    function getOffset(el) {
        var ol = 0, ot = 0;
        while (el) {
            ol += el.offsetLeft;
            ot += el.offsetTop;
            el = el.offsetParent;
        }
        return {left: ol, top: ot};
    }
};

slider.prototype = {

    constructor: slider,

    /**
     * Init values
     *
     * Those values may be changed anytime (eg. if scale has changed)
     *
     * @param minVal
     * @param maxVal
     * @param val
     * @param decimals
     */
    init: function (minVal, maxVal, val, decimals) {

        this.minVal    = typeof minVal !== "undefined" ? minVal : 0;
        this.maxVal    = typeof maxVal !== "undefined" ? maxVal : 100;
        this.decimals  = Math.pow(10, typeof decimals !== "undefined" ? decimals : 0);
        this.value     = typeof val !== "undefined" ? val : Math.round((this.maxVal - this.minVal) / 2 * this.decimals) / this.decimals;
        this.valueBak  = this.value;
        this.rangeUnit = (this.maxVal - this.minVal) / this.rangeWidth;
        this.update();
    },

    /**
     * Update value and slider position
     */
    update: function () {
        this.input.value        = this.value;
        this.dragger.style.left = ((this.value - this.minVal) / this.rangeUnit ) + 'px';
    },

    /**
     * Set value
     */
    setValue: function (v) {
        v                = Math.round(v * this.decimals) / this.decimals;
        this.input.value = v;
        this.input.dispatchEvent(new Event("change"));
    },

    /**
     * Reset value to original
     */
    resetValue: function () {
        this.value = this.valueBak;
        this.update();
    },

    /**
     * Set enabled
     */
    enable: function () {
        this.slider.classList.remove("disabled");
        this.input.disabled = false;
    },

    /**
     * Set disabled
     */
    disable: function () {
        this.slider.classList.add("disabled");
        this.input.disabled = true;
    }
};