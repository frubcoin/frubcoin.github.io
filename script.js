function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
class Pointer {
  constructor(domElement, {
    scaleMin = 0.01,
    scaleMax = 10.0,
    pressureMax = 1.0,
    pressureDuration = 1000
  } = {}) {
    if (Pointer.instance) {
      return Pointer.instance;
    }
    this.dom = domElement;
    this.opt = {
      scaleMin,
      scaleMax,
      pressureMax,
      pressureDuration
    };
    this.pressCheckInterval = 20;
    this.deltaPressure = this.opt.pressureMax / this.opt.pressureDuration * this.pressCheckInterval;
    this.position = new Vector2();
    this.zoomSpeed = 1.0;
    this.scale = 1.0;
    this.dollyStart = new Vector2();
    this.dollyEnd = new Vector2();
    this.dollyDelta = new Vector2();
    this.addMoveListener(this.onMove.bind(this));
    this.addDownListener(this.onDown.bind(this));
    this.addUpListener(this.onUp.bind(this));
    this.dom.addEventListener('touchstart', this._onTouchZoomStart, false);
    this.addZoomListener(this.onZoom.bind(this));
    this.isPressing = false;
    this.pressure = 0.0;
    Pointer.instance = this;
  }
  get zoomScale() {
    return Math.pow(0.95, this.zoomSpeed);
  }
  setScale(val) {
    this.scale = clamp(val, this.opt.scaleMin, this.opt.scaleMax);
  }
  updatePosition(clientX, clientY) {
    let size = Math.min(this.dom.clientWidth, this.dom.clientHeight);
    this.position.x = (clientX * 2 - this.dom.clientWidth) / size;
    this.position.y = ((this.dom.clientHeight - clientY) * 2 - this.dom.clientHeight) / size;
  }
  onMove(e) {
    let x, y;
    if (e.touches) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    this.updatePosition(x, y);
    // e.preventDefault();
  }
  addMoveListener(cb) {
    ['mousemove', 'touchmove'].forEach(evtName => {
      this.dom.addEventListener(evtName, cb, false);
    });
  }
  setPressure(val) {
    let valid = val <= this.opt.pressureMax && val >= 0.0;
    this.pressure = clamp(val, 0.0, this.opt.pressureMax);
    //   console.log(this.pressure);
    return valid;
  }
  onDown(e) {
    if (e instanceof MouseEvent && e.button !== Pointer.BUTTON.MOUSE_LEFT) {
      return;
    }
    this.isPressing = true;
    if (e.touches) {
      let x = e.touches[0].clientX;
      let y = e.touches[0].clientY;
      this.updatePosition(x, y);
    }
    let intervalID = setInterval(() => {
      if (!this.isPressing || !this.setPressure(this.pressure + this.deltaPressure)) {
        clearInterval(intervalID);
      }
    }, this.pressCheckInterval);
    let pressingTest = setInterval(() => {
      if (this.isPressing) {
        var event = new CustomEvent('Pointer.pressing', {
          detail: this.pressure
        });
        this.dom.dispatchEvent(event);
      } else {
        clearInterval(pressingTest);
      }
    }, this.pressCheckInterval);
  }
  addDownListener(cb) {
    ['mousedown', 'touchstart'].forEach(evtName => {
      this.dom.addEventListener(evtName, cb, false);
    });
  }
  addPressingListener(cb) {
    ['Pointer.pressing', 'Pointer.postpressing'].forEach(evtName => {
      this.dom.addEventListener(evtName, cb, false);
    });
  }
  addPressingEndListener(cb) {
    this.dom.addEventListener('Pointer.pressingEnd', cb, false);
  }
  onUp(e) {
    if (e instanceof MouseEvent && e.button !== Pointer.BUTTON.MOUSE_LEFT) {
      return;
    }
    this.isPressing = false;
    let intervalID = setInterval(() => {
      if (this.isPressing || !this.setPressure(this.pressure - this.deltaPressure)) {
        var event = new CustomEvent('Pointer.pressingEnd', {
          detail: this.pressure
        });
        this.dom.dispatchEvent(event);
        clearInterval(intervalID);
      } else {
        var event = new CustomEvent('Pointer.postpressing', {
          detail: this.pressure
        });
        this.dom.dispatchEvent(event);
      }
    }, this.pressCheckInterval);
  }
  addUpListener(cb) {
    ['mouseup', 'touchend'].forEach(evtName => {
      this.dom.addEventListener(evtName, cb, false);
    });
  }
  _onTouchZoomStart(e) {
    if (e.touches.length !== 2) return;
    let dx = e.touches[0].pageX - e.touches[1].pageX;
    let dy = e.touches[0].pageY - e.touches[1].pageY;
    this.dollyStart.set(0, Math.sqrt(dx * dx + dy * dy));
  }
  _onTouchZoom(e) {
    var dx = e.touches[0].pageX - e.touches[1].pageX;
    var dy = e.touches[0].pageY - e.touches[1].pageY;
    this.dollyEnd.set(0, Math.sqrt(dx * dx + dy * dy));
    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
    if (dollyDelta.y > 0) {
      this.zoomOut();
    } else if (dollyDelta.y < 0) {
      this.zoomIn();
    }
    this.dollyStart.copy(this.dollyEnd);
  }
  _onWheelZoom(e) {
    if (e.deltaY > 0) {
      this.zoomOut();
    } else if (e.deltaY < 0) {
      this.zoomIn();
    }
    e.preventDefault(); // prevent page scroll down
  }
  onZoom(e) {
    if (e.touches) {
      this._onTouchZoom(e);
    } else {
      this._onWheelZoom(e);
    }
  }
  addZoomListener(cb) {
    ['wheel', 'touchmove'].forEach(evtName => {
      if (evtName === 'touchmove') {
        cb = e => {
          return e.touches.length === 2 ? cb(e) : undefined;
        };
      }
      this.dom.addEventListener(evtName, cb, false);
    });
  }
  zoomIn(scaleFactor = this.zoomScale) {
    this.setScale(this.scale * scaleFactor);
  }
  zoomOut(scaleFactor = this.zoomScale) {
    this.setScale(this.scale / scaleFactor);
  }
}
Pointer.instance = null;
Pointer.BUTTON = {
  MOUSE_LEFT: 0,
  MOUSE_MIDDLE: 1,
  MOUSE_RIGHT: 2
};
const regl = createREGL();
const DEV = false;
const seed = DEV ? 38975.579831 : new Date().getTime() % 100000;
const pointer = new Pointer(regl._gl.canvas);
let lastPressingT,
  dtSec = 0,
  morphAmount = 0;
pointer.addPressingListener(e => {
  lastPressingT = lastPressingT || Date.now();
  const nowInMs = Date.now();
  dtSec = (nowInMs - lastPressingT) / 1000;
  lastPressingT = nowInMs;
  morphAmount += dtSec * pointer.pressure * 0.1;
});


const draw = regl({
  frag: `
    precision mediump float;
    #define SEED ${seed}.579831

    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uMorph;
    uniform vec2 uGrid;

    const int   complexity  = 10;   // complexity of curls/computation
    const float mouseSpeed  = 0.3;  // control the color changing
    const float fixedOffset = 0.7;  // Drives complexity in the amount of curls/cuves.  Zero is a single whirlpool.
    const float fluidSpeed  = 0.07; // Drives speed, smaller number will make it slower.
    const float baseColor   = 0.6;
    const float BLUR        = 0.47;

    #define PI 3.14159

    // more about noise: 
    // http://thebookofshaders.com/11/
    float random(float x) {
      return fract(sin(x) * SEED);
    }
    float noise(float x) {
      float i = floor(x);
      float f = fract(x);
      return mix(random(i), random(i + 1.0), smoothstep(0.0, 1.0, f));
    }
    float noiseS(float x) {
      return noise(x) * 2.0 - 1.0;
    }

    void main() {
      vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / min(uResolution.x, uResolution.y) * 0.7;
      float t = uTime * fluidSpeed + uMorph;
      float noiseTime = noise(t);
      float noiseSTime = noiseS(t);
      float noiseSTime1 = noiseS(t + 1.0);

      float blur = (BLUR + 0.14 * noiseSTime);
      for(int i=1; i <= complexity; i++) {
        p += blur / float(i) * sin(
            float(i) * p.yx + t + PI * vec2(noiseSTime, noiseSTime1))
          + fixedOffset;
      }
      for(int i=1; i <= complexity; i++) {
        p += blur / float(i) * cos(
            float(i) * p.yx + t + PI * vec2(noiseSTime, noiseSTime1))
          + fixedOffset;
      }
      p += uMouse * mouseSpeed;

      vec2 grid = uGrid * 2.0; // set complexity to 0 to debug the grid
      gl_FragColor = vec4(
        baseColor * vec3(
          sin(grid * p + vec2(2.0 * noiseSTime, 3.0 * noiseSTime1)),
          sin(p.x + p.y + noiseSTime)
        )
        + baseColor,
        1.0);
    }
  `,
  vert: `
    attribute vec2 position;
    void main () {
      gl_Position = vec4(position, 0, 1);
    }
  `,

  attributes: {
    position: regl.buffer([[-1, -1], [1, -1], [-1, 1],
    [-1, 1], [1, 1], [1, -1] 
    ])


  },
  uniforms: {
    uResolution: ({
      viewportWidth,
      viewportHeight
    }) => [viewportWidth, viewportHeight],
    uTime: ({
      tick
    }) => 0.01 * tick,
    uMouse: () => [pointer.position.x, pointer.position.y],
    uMorph: () => morphAmount,
    uRandomSeed: DEV ? 138975.579831 : new Date().getTime() % 1000000,
    //
    uGrid: ({
      viewportWidth,
      viewportHeight
    }) => {
      const ratio = 0.32;
      return viewportHeight >= viewportWidth ? [1, viewportHeight / viewportWidth * ratio] : [viewportWidth / viewportHeight * ratio, 1];
    }
  },

  count: 6
});


regl.frame(() => {
  draw();
});
