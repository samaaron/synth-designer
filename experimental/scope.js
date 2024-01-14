/**
* =========================================================================
* ScopeView - a line view for the scope (other views are possible ...)
* =========================================================================
*/
export class ScopeView {

    _SYNC_WINDOW = 200

    _context
    _width
    _height
    _sync

    /**
     * Make a scope view
     * @param {string} canvas - name of the HTML canvas
     * @param {Object} params - parameters for display and sync
     */
    constructor(canvas, params) {
        this._context = canvas.getContext("2d");
        this._width = canvas.width;
        this._height = canvas.height;
        this._context.fillStyle = (params && params.fillStyle) ? params.fillStyle : "rgb(30,30,30)";
        this._context.lineWidth = (params && params.lineWidth) ? params.lineWidth : 2;
        this._context.strokeStyle = (params && params.strokeStyle) ? params.strokeStyle : "rgb(200,200,200)";
        this._sync = (params && params.sync) ? params.sync : false;
    }

    /**
     * 
     * @param {Uint8Array} data - the array to display
     */
    draw(data) {
        let st = 0;
        if (this._sync) {
            st = this.firstZeroCrossing(data);
            if (st > this._SYNC_WINDOW) {
                st = 0;
            }
        }
        const n = data.length - this._SYNC_WINDOW;
        const stepSize = this._width / n;
        this._context.fillRect(0, 0, this._width, this._height);
        let x = 0;
        this._context.beginPath();
        let y = data[st] * this._height / 256;
        this._context.moveTo(x, y);
        for (let i = 1; i < n; i++) {
            y = data[st + i] * this._height / 256;
            this._context.lineTo(x, y);
            x += stepSize;
        }
        this._context.lineTo(this._width, this._height / 2);
        this._context.stroke();
    }

    /**
     * 
     * @param {Uint8Array} data  - the array to process
     * @returns an integer index
     */
    firstZeroCrossing(data) {
        let idx = 0;
        while ((idx < (data.length - 2)) && (data[idx] * data[idx + 1] > 0)) {
            idx++;
        }
        return idx;
    }
}

/**
* =========================================================================
* Scope - model-controller for the scope
* =========================================================================
*/
export class Scope {

    _analyser
    _dataArray
    _view

    /**
     * Make a scope model-controller
     * @param {AudioContext} ctx - the audio context
     * @param {ScopeView} view - the scope view
     */
    constructor(ctx, view) {
        this._view = view;
        this._analyser = ctx.createAnalyser();
        this._analyser.fftSize = 2048;
        const bufferLength = this._analyser.fftSize;
        this._dataArray = new Uint8Array(bufferLength);
    }

    /**
     * Get a frame of data to display
     */
    get frame() {
        return this._dataArray;
    }

    /**
    * Draw the data
    * Because we need to refer to this.draw when we request the animation
    * frame, must use an arrow function which retains the surrounding context
    */
    draw = () => {
        this._analyser.getByteTimeDomainData(this._dataArray);
        this._view.draw(this._dataArray);
        requestAnimationFrame(this.draw);
    }

    /**
     * Get the input node
     */
    get in() {
        return this._analyser;
    }

}