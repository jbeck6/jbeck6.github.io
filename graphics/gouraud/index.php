<html>
<head>
<meta charset="utf-8">
<title>Model Viewer</title>
<!-- include all javascript source files -->
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
<script type="text/javascript" src="js/sylvester.js"></script>
<script type="text/javascript" src="js/math.js"></script>
<script type="text/javascript" src="js/glUtils.js"></script>
<script type="text/javascript" src="js/meshLoader.js"></script>
<script type="text/javascript" src="js/arcball.js"></script>
<script type="text/javascript" src="js/demo.js"></script>
<script type="text/javascript" src="js/main.js"></script>
</head>
<body>
<canvas id="glcanvas">canvas not supported</canvas>

<div id="meshSelect-wrapper">
    <span>Select object from this directory (.obj files only)</span>
    <select id="meshSelect">
    <option>bunny.obj</option><option selected="selected">teapot.obj</option>    </select>
    <br />
    <span>Or upload a local file here:</span>
    <input type="file" id="files" name="files[]"/>
</div>


<!-- Fragment Shader -->
<script id="FragmentShader1" type="x-shader/x-fragment">
    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif

    precision mediump float;
    varying vec3 interpBary;
				varying vec4 vLighting;
				varying vec4 transformedNormal;

    void main(void){
    //change this from true to false and compare the differences
        bool antiAliasing = true;
        vec4 blue = vec4(0.0,0.5,1.0,1.0);
        vec4 white = vec4(1.0,1.0,1.0,1.0);

    //  Advanced version
        //shader which draws anti-aliased edge lines on the mesh
        //uses fwidth and passed in barycentric coordinates
        if(antiAliasing){
            vec3 dF = fwidth(interpBary);
            vec3 smoothdF = smoothstep(vec3(0.0),dF, interpBary);
            float g = min(min(smoothdF.x,smoothdF.y),smoothdF.z);
            
												gl_FragColor = vLighting;
								} 
    //  Simple Version
        //This checks if the fragments are near the edge and colors blue if true
        //      and white if false
        //This shader exhibits aliasing which is why the edge lines appear jagged
        else {
            if(any(lessThan(interpBary,vec3(0.02)))){
                gl_FragColor = blue;
            }
            else {
                gl_FragColor = white;
            }
        }
    }

</script>

<!-- Vertex Shader -->
<script id="VertexShader1" type="x-shader/x-vertex">
    attribute vec3 vPos; //vertex position
    attribute vec3 bary; //barycentric
				attribute vec3 norm;
    varying vec3 interpBary;
				varying vec4 transformedNormal;
    

    uniform mat4 uMVMatrix;//modelviewmatrix
    uniform mat4 uPMatrix;//projectionmatrix
    uniform mat4 uNormalMatrix;//normalsmatrix
				uniform vec3 cam;

				varying vec4 vLighting;

    void main(void) {
        gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);

								vec4 vertex = uMVMatrix * vec4(vPos, 1.0);

        interpBary = bary;
								transformedNormal = uNormalMatrix * vec4(norm, 1.0);
								vec3 N = vec3( uNormalMatrix * vec4(norm, 1.0));

								vec3 directionalVector = cam; //vec3(0.0, 0.0, -5.766765204919401);
								directionalVector.z = -directionalVector.z;
								vec3 L = normalize(directionalVector);

								float lambertTerm = dot(N, -L);

								vec4 ambientLight = vec4(0.6, 0.6, 0.6, 1.0);
								vec4 materialAmbient = vec4(0.329412, 0.223529, 0.027451, 1.0);
								vec4 Ia = ambientLight * materialAmbient;

								vec4 Id = vec4(0.0,0.0,0.0,1.0);

								vec4 Is = vec4(0.0,0.0,0.0,1.0);

								vec4 materialSpecular = vec4(0.992157, 0.941176, 0.807843, 1.0);
								vec4 lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
								vec4 lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
								vec4 materialDiffuse = vec4(0.780392, 0.568627, 0.113725, 1.0);
								if (lambertTerm > 0.0)
								{
										Id = lightDiffuse * materialDiffuse * lambertTerm;
										
										vec3 eyeVec = -vec3(vertex.xyz);
										vec3 E = normalize(eyeVec);
										vec3 R = reflect(L, N);
										float specular = pow(max(dot(R, E), 0.0), 27.8974);

										Is = lightSpecular * materialSpecular * specular;
								}

								vLighting = Ia + Id + Is;
								vLighting.a = 1.0;
								
								float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    }
</script>


<script>
    //grab the filename for the .obj we will first open
    var filename = "teapot.obj";

    //register callbacks for mesh loading
    setupLoadingCallbacks();

    //call the main mesh Loading function; main.js
    executeMainLoop(filename); 
</script>

</body>
</html>
