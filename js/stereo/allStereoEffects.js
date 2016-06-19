/**
 * All stereoscopic effects in one single file
 *
 * @see Based on Masuji Suto sample {@link http://stereo.jpn.org/theta/stereoeffect/index.html)
 * @version 1.0.0 20160609
 * @author cosmicmac / https://github.com/cosmicmac
 */

//****************************************************************************

/**
 * Side by side effect
 * Based on StereoEffect (r77)
 *
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author arodic / http://aleksandarrodic.com/
 * @author fonserbc / http://fonserbc.github.io/
 * @author cosmicmac / https://github.com/cosmicmac
 *
 * @param {Object} renderer
 * @param {boolean} halfSize    Set true for 3D TV
 */
THREE.SideBySideEffect = function (renderer, halfSize) {

    this.swapLR = false;
    this.name   = 'Side by side' + (halfSize ? ' (half size)' : '');

    var _stereo    = new THREE.cmStereoCamera();
    _stereo.aspect = halfSize ? 1 : .5;

    this.setSize = function (width, height) {
        renderer.setSize(width, height);
    };

    this.render = function (scene, camera) {

        scene.updateMatrixWorld();

        if (camera.parent === null) {
            camera.updateMatrixWorld();
        }

        _stereo.update(camera);

        var size = renderer.getSize();

        renderer.setScissorTest(true);
        renderer.clear();

        renderer.setScissor(0, 0, size.width / 2, size.height);
        renderer.setViewport(0, 0, size.width / 2, size.height);
        renderer.render(scene, this.swapLR ? _stereo.cameraR : _stereo.cameraL);

        renderer.setScissor(size.width / 2, 0, size.width / 2, size.height);
        renderer.setViewport(size.width / 2, 0, size.width / 2, size.height);
        renderer.render(scene, this.swapLR ? _stereo.cameraL : _stereo.cameraR);

        renderer.setScissorTest(false);

    };

    this.end = function () {
        _stereo.aspect = 0.5;
        _stereo.update(camera);
    };

    this.dispose = function () {
    };
};


/**
 * Interlaced effect
 * Based on ParallaxBarrierEffect (r77)
 *
 * @author mrdoob / http://mrdoob.com/
 * @author marklundin / http://mark-lundin.com/
 * @author alteredq / http://alteredqualia.com/
 * @author cosmicmac / https://github.com/cosmicmac
 *
 * @param {Object} renderer
 */
THREE.ParallaxBarrierEffect = function (renderer) {

    this.swapLR = false;
    this.name   = 'Interlaced';

    var _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var _scene  = new THREE.Scene();
    var _stereo = new THREE.cmStereoCamera();

    var _params = {minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat};

    var _renderTargetL = new THREE.WebGLRenderTarget(512, 512, _params);
    var _renderTargetR = new THREE.WebGLRenderTarget(512, 512, _params);

    var _material = new THREE.ShaderMaterial({
        uniforms:       {
            "mapLeft":  {type: "t", value: _renderTargetL.texture},
            "mapRight": {type: "t", value: _renderTargetR.texture}
        },
        vertexShader:   [
                            "varying vec2 vUv;",
                            "void main() {",
                            "	vUv = vec2( uv.x, uv.y );",
                            "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                            "}"
                        ].join("\n"),
        fragmentShader: [
                            "uniform sampler2D mapLeft;",
                            "uniform sampler2D mapRight;",
                            "varying vec2 vUv;",

                            "void main() {",
                            "	vec2 uv = vUv;",
                            "	if ( ( mod( gl_FragCoord.y, 2.0 ) ) > 1.00 ) {",
                            "		gl_FragColor = texture2D( mapLeft, uv );",
                            "	} else {",
                            "		gl_FragColor = texture2D( mapRight, uv );",
                            "	}",
                            "}"
                        ].join("\n")
    });

    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), _material);
    _scene.add(mesh);

    this.setSize = function (width, height) {

        renderer.setSize(width, height);

        var pixelRatio = renderer.getPixelRatio();

        _renderTargetL.setSize(width * pixelRatio, height * pixelRatio);
        _renderTargetR.setSize(width * pixelRatio, height * pixelRatio);

    };

    this.render = function (scene, camera) {

        scene.updateMatrixWorld();

        if (camera.parent === null) {
            camera.updateMatrixWorld();
        }

        _stereo.update(camera);

        renderer.render(scene, this.swapLR ? _stereo.cameraR : _stereo.cameraL, _renderTargetL, true);
        renderer.render(scene, this.swapLR ? _stereo.cameraL : _stereo.cameraR, _renderTargetR, true);
        renderer.render(_scene, _camera);

    };

    this.end = function () {
        _stereo.aspect = 0.5;
        _stereo.update(camera);
    };

    this.dispose = function () {
        _renderTargetL.dispose();
        _renderTargetR.dispose();
    };
};

/**
 * Anaglyph effect
 * Based on AnaglyphEffect (r77), with some matrices ripped from {@link http://stereo.jpn.org/theta/stereoeffect/index.html}
 *
 * @author mrdoob / http://mrdoob.com/
 * @author marklundin / http://mark-lundin.com/
 * @author alteredq / http://alteredqualia.com/
 * @author tschw *
 * @author muttyan / http://stereo.jpn.org/eng/index.html
 * @author cosmicmac / https://github.com/cosmicmac
 *
 * @param {Object} renderer
 * @param {string} type     Anaglyph type [redcyan|gray|color]
 */
THREE.AnaglyphEffect = function (renderer, type) {

    this.swapLR = false;

    // Matrices generated with angler.js https://github.com/tschw/angler.js/
    // (in column-major element order, as accepted by WebGL)

    switch (type) {
        case 'redcyan':
            this.name             = 'Anaglyph (red/cyan)';
            this.colorMatrixLeft  = new THREE.Matrix3().fromArray([
                //r g b in
                1, 0, 0, // r out
                0, 0, 0, // g out
                0, 0, 0  // b out
            ]);
            this.colorMatrixRight = new THREE.Matrix3().fromArray([
                //r g b in
                0, 0, 0, // r out
                0, 1, 0, // g out
                0, 0, 1  // b out
            ]);
            break;
        case 'gray':
            this.name             = 'Anaglyph (gray)';
            this.colorMatrixLeft  = new THREE.Matrix3().fromArray([
                //r g b in
                0.299, 0, 0, // r out
                0.587, 0, 0, // g out
                0.114, 0, 0  // b out
            ]);
            this.colorMatrixRight = new THREE.Matrix3().fromArray([
                //r g b in
                0, 0.299, 0.299, // r out
                0, 0.587, 0.587, // g out
                0, 0.114, 0.114  // b out
            ]);
            break;
        default: // color
            this.name             = 'Anaglyph (color)';
            this.colorMatrixLeft  = new THREE.Matrix3().fromArray([
                //r g b in
                1.0671679973602295, -0.0016435992438346148, 0.0001777536963345483,      // r out
                -0.028107794001698494, -0.00019593400065787137, -0.0002875397040043026, // g out
                -0.04279090091586113, 0.000015809757314855233, -0.00024287120322696865  // b out
            ]);
            this.colorMatrixRight = new THREE.Matrix3().fromArray([
                //r g b in
                -0.0355340838432312, -0.06440307199954987, 0.018319187685847282, // r out
                -0.10269022732973099, 0.8079727292060852, -0.04835830628871918,  // g out
                0.0001224992738571018, -0.009558862075209618, 0.567823588848114  // b out
            ]);
    }

    var _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var _scene  = new THREE.Scene();
    var _stereo = new THREE.cmStereoCamera();

    var _params = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        format:    THREE.RGBAFormat
    };

    var _renderTargetL = new THREE.WebGLRenderTarget(512, 512, _params);
    var _renderTargetR = new THREE.WebGLRenderTarget(512, 512, _params);

    var _material = new THREE.ShaderMaterial({

        uniforms: {
            "mapLeft":          {type: "t", value: _renderTargetL.texture},
            "mapRight":         {type: "t", value: _renderTargetR.texture},
            "colorMatrixLeft":  {type: "m3", value: this.colorMatrixLeft},
            "colorMatrixRight": {type: "m3", value: this.colorMatrixRight}
        },

        vertexShader: [
                          "varying vec2 vUv;",
                          "void main() {",
                          "	vUv = vec2( uv.x, uv.y );",
                          "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                          "}"
                      ].join("\n"),

        fragmentShader: [
                            "uniform sampler2D mapLeft;",
                            "uniform sampler2D mapRight;",
                            "varying vec2 vUv;",
                            "uniform mat3 colorMatrixLeft;",
                            "uniform mat3 colorMatrixRight;",

                            // These functions implement sRGB linearization and gamma correction
                            "float lin( float c ) {",
                            "	return c <= 0.04045 ? c * 0.0773993808 :",
                            "			pow( c * 0.9478672986 + 0.0521327014, 2.4 );",
                            "}",

                            "vec4 lin( vec4 c ) {",
                            "	return vec4( lin( c.r ), lin( c.g ), lin( c.b ), c.a );",
                            "}",

                            "float dev( float c ) {",
                            "	return c <= 0.0031308 ? c * 12.92",
                            "			: pow( c, 0.41666 ) * 1.055 - 0.055;",
                            "}",

                            "void main() {",
                            "	vec2 uv = vUv;",
                            "	vec4 colorL = lin( texture2D( mapLeft, uv ) );",
                            "	vec4 colorR = lin( texture2D( mapRight, uv ) );",
                            "	vec3 color = clamp(",
                            "			colorMatrixLeft * colorL.rgb +",
                            "			colorMatrixRight * colorR.rgb, 0., 1. );",

                            "	gl_FragColor = vec4(",
                            "			dev( color.r ), dev( color.g ), dev( color.b ),",
                            "			max( colorL.a, colorR.a ) );",

                            "}"
                        ].join("\n")

    });

    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), _material);
    _scene.add(mesh);

    this.setSize = function (width, height) {

        renderer.setSize(width, height);

        var pixelRatio = renderer.getPixelRatio();

        _renderTargetL.setSize(width * pixelRatio, height * pixelRatio);
        _renderTargetR.setSize(width * pixelRatio, height * pixelRatio);

    };

    this.render = function (scene, camera) {

        scene.updateMatrixWorld();

        if (camera.parent === null) {
            camera.updateMatrixWorld();
        }

        _stereo.update(camera);

        renderer.render(scene, this.swapLR ? _stereo.cameraR : _stereo.cameraL, _renderTargetL, true);
        renderer.render(scene, this.swapLR ? _stereo.cameraL : _stereo.cameraR, _renderTargetR, true);
        renderer.render(_scene, _camera);

    };

    this.end = function () {
        _stereo.aspect = 0.5;
        _stereo.update(camera);
    };

    this.dispose = function () {
        _renderTargetL.dispose();
        _renderTargetR.dispose();
    };

};

//****************************************************************************

var stereoEffect     = null;
var stereoEffectList = ['sbs', 'sbsHalf', 'interlaced', 'anaColor', 'anaRedcyan', 'anaGray'];

/**
 * Helper for stereo effects
 *
 * @author cosmicmac / https://github.com/cosmicmac
 *
 * @param {Object} renderer
 * @param {Object} camera
 * @param {string} type     See stereoEffectsList above
 * @param {int} fov
 */
function setStereoEffect(renderer, camera, type, fov) {

    if (stereoEffect) {
        stereoEffect.end();
        stereoEffect.dispose();
        camera.fov = fov;
    }

    switch (type) {
        case 'sbs':
            stereoEffect = new THREE.SideBySideEffect(renderer, false);
            camera.fov   = fov * 1.3;
            break;
        case 'sbsHalf':
            stereoEffect = new THREE.SideBySideEffect(renderer, true);
            break;
        case 'interlaced':
            stereoEffect = new THREE.ParallaxBarrierEffect(renderer);
            break;
        case 'anaRedcyan':
            stereoEffect = new THREE.AnaglyphEffect(renderer, 'redcyan');
            break;
        case 'anaColor':
            stereoEffect = new THREE.AnaglyphEffect(renderer, 'color');
            break;
        case 'anaGray':
        default:
            stereoEffect = new THREE.AnaglyphEffect(renderer, 'gray');
            break;
    }

    camera.updateProjectionMatrix();
    stereoEffect.setSize(window.innerWidth, window.innerHeight);
}

