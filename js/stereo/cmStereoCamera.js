/**
 * cosmicmac version based on original StereoCamera (r77)
 * Hard coded eyeSep has been replaced with the base property.
 * The base is inherited from the camera base property if present (otherwise the default value is used).
 * Now you are free to use the good ol' "1/30th" rule ;) {@link http://www.berezin.com/3d/Tech/lens_separation_in_stereo_photog.htm}.
 *
 * @author mrdoob / http://mrdoob.com/
 * @author cosmicmac / https://github.com/cosmicmac
 */

THREE.cmStereoCamera = function () {

    this.type = 'StereoCamera';

    this.aspect = 1;

    this.base = 0.064; // !cosmicmac default "eyeSep" (aka stereo base)

    this.cameraL = new THREE.PerspectiveCamera();
    this.cameraL.layers.enable(1);
    this.cameraL.matrixAutoUpdate = false;

    this.cameraR = new THREE.PerspectiveCamera();
    this.cameraR.layers.enable(2);
    this.cameraR.matrixAutoUpdate = false;

};

Object.assign(THREE.cmStereoCamera.prototype, {

    update: (function () {

        var focus, fov, aspect, near, far,
            base; // !cosmicmac

        var eyeRight = new THREE.Matrix4();
        var eyeLeft  = new THREE.Matrix4();

        return function update(camera) {

            var needsUpdate = (
                focus !== camera.focus ||
                fov !== camera.fov ||
                aspect !== camera.aspect * this.aspect ||
                near !== camera.near ||
                far !== camera.far ||
                (typeof camera.base !== 'undefined' && base !== camera.base) // !cosmicmac
            );

            if (needsUpdate) {

                focus  = camera.focus;
                fov    = camera.fov;
                aspect = camera.aspect * this.aspect;
                near   = camera.near;
                far    = camera.far;
                base   = typeof camera.base !== 'undefined' ? camera.base : this.base; // !cosmicmac

                // Off-axis stereoscopic effect based on
                // http://paulbourke.net/stereographics/stereorender/

                var projectionMatrix   = camera.projectionMatrix.clone();
                var eyeSep             = base / 2;
                var eyeSepOnProjection = eyeSep * near / focus;
                var ymax               = near * Math.tan(THREE.Math.DEG2RAD * fov * 0.5);
                var xmin, xmax;

                // translate xOffset

                eyeLeft.elements[12]  = -eyeSep;
                eyeRight.elements[12] = eyeSep;

                // for left eye

                xmin = -ymax * aspect + eyeSepOnProjection;
                xmax = ymax * aspect + eyeSepOnProjection;

                projectionMatrix.elements[0] = 2 * near / ( xmax - xmin );
                projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

                this.cameraL.projectionMatrix.copy(projectionMatrix);

                // for right eye

                xmin = -ymax * aspect - eyeSepOnProjection;
                xmax = ymax * aspect - eyeSepOnProjection;

                projectionMatrix.elements[0] = 2 * near / ( xmax - xmin );
                projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

                this.cameraR.projectionMatrix.copy(projectionMatrix);

            }

            this.cameraL.matrixWorld.copy(camera.matrixWorld).multiply(eyeLeft);
            this.cameraR.matrixWorld.copy(camera.matrixWorld).multiply(eyeRight);

        };

    })()

});
