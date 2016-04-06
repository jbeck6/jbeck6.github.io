var gl = null; //our OpenGL handler

var GC = {};   //the graphics context

//initialize the graphics context variables
GC.shaderProgram = null;          //our GLSL program
GC.vertexPositionAttribute = null;//location of vertex positions in GLSL program
GC.barycentricBuffer = null;      //array passed to shader to create wireframe display
GC.barycentricAttribute = null;   //location of barycentric coordinate array in GLSL program
GC.perspectiveMatrix = null;      //the Perspective matrix
GC.cameraPosAttribute = null;     // camera position 
GC.maxyAttribute = null;          // max y 
GC.mvMatrix = null;               //the ModelView matrix
GC.mvMatrixStack = [];            //the ModelView matrix stack
GC.mesh = null;                   //the current mesh
GC.mouseDown = null;              //boolean check for mouseDown
GC.width = 640;                   //render area width
GC.height = 480;                  //render area height
//GC.normalsBuffer = null;										// normals
GC.normalsAttribute = null;							// normals attrib
GC.normalMatrix = null;

var camera = new ArcBall();              //create a new arcball camera
camera.setBounds(GC.width,GC.height);    //initialize camera with screen space dimensions


//demo constructor
function demo(canvasName,Mesh) {
		this.canvasName = canvasName;
		GC.mesh = Mesh;
}

//initialize webgl, populate all buffers, load shader programs, and start drawing
demo.prototype.init = function(){
		this.canvas = document.getElementById(this.canvasName);
		this.canvas.width = GC.width;
		this.canvas.height = GC.height;

		//Here we check to see if WebGL is supported 
		this.initWebGL(this.canvas);

		gl.clearColor(0.0,0.0,0.0,1.0);     //background to black
		gl.clearDepth(1.0);                 //set depth to yon plane
		gl.enable(gl.DEPTH_TEST);           //enable depth test
		gl.depthFunc(gl.LEQUAL);            //change depth test to use LEQUAL

		//set mouse event callbacks
		this.setMouseEventCallbacks();

		//set keyboard event callbacks
		this.setKeyboardEventCallbacks();

		//Get opengl derivative extension -- enables using fwidth in shader
		gl.getExtension("OES_standard_derivatives");

		//init the shader programs
		this.initShaders();

		//init the vertex buffer
		this.initGeometryBuffers();

		//init the normals buffer
		//this.initNormalsBuffer();
}

demo.prototype.MainLoop = function(){
		drawScene();
}

demo.prototype.setMouseEventCallbacks = function(){
		//-------- set callback functions
		this.canvas.onmousedown = this.mouseDown;
		this.canvas.onmousewheel = this.mouseWheel;

		//--Why set these to callbacks for the document object?
		document.onmouseup = this.mouseUp;          
		document.onmousemove = this.mouseMove;

		//--touch event callbacks
		this.canvas.ontouchstart = this.touchDown;
		this.canvas.ontouchend = this.touchUp;
		this.canvas.ontouchmove = this.touchMove;
		//-------- end set callback functions
}

demo.prototype.setKeyboardEventCallbacks = function(){
		//--Why set these to callbacks for the document object?
		document.onkeydown = this.keyDown;          
}

//initialize the shaders and grab the shader variable attributes
demo.prototype.initShaders = function(){

		//Load the shaders
		var fragmentShader = this.getShader("FragmentShader1");
		var vertexShader = this.getShader("VertexShader1");

		this.shaderProgram = gl.createProgram();
		gl.attachShader(this.shaderProgram, vertexShader);
		gl.attachShader(this.shaderProgram, fragmentShader);
		gl.linkProgram(this.shaderProgram);

		if(!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)){
				console.log("unable to init shader program");
		}

		gl.useProgram(this.shaderProgram);

		GC.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, "vPos");
		gl.enableVertexAttribArray(GC.vertexPositionAttribute);

		GC.barycentricAttribute = gl.getAttribLocation(this.shaderProgram, "bary");
		gl.enableVertexAttribArray(GC.barycentricAttribute);

		GC.normalsAttribute = gl.getAttribLocation(this.shaderProgram, "norm");
		gl.enableVertexAttribArray(GC.normalsAttribute);

		GC.cameraPosAttribute = gl.getUniformLocation(this.shaderProgram, "cam");
		GC.maxyAttribute = gl.getUniformLocation(this.shaderProgram, "maxY");

		GC.shaderProgram = this.shaderProgram;
}

//initialize the buffers for drawing and the edge highlights
demo.prototype.initGeometryBuffers = function(){
		var m = GC.mesh.model;

		//create an OpenGL buffer
		GC.barycentricBuffer = gl.createBuffer();

		var verts = [];                   //array to hold vertices laid out according to indices
		var bary = [];                    //array of 1s and 0s passed to GLSL to draw wireframe
		var min = [90000,90000,90000];    //used for bounding box calculations
		var max = [-90000,-90000,-90000]; //used for bounding box calculations

		// Loop through the indices array and create a vertices array (this means
		//     duplicating data) from the listed indices
		m.indices.forEach(function(d,i){
						//grab the x,y,z values for the current vertex
						vx = (parseFloat(m.vertices[d*3]));
						vy = (parseFloat(m.vertices[d*3+1]));
						vz = (parseFloat(m.vertices[d*3+2]));

						//add this vertex to our array
						verts.push(vx,vy,vz);

						//check to see if we need to update the min/max
						if(vx < min[0]) min[0] = vx;
						if(vy < min[1]) min[1] = vy;
						if(vz < min[2]) min[2] = vz;
						if(vx > max[0]) max[0] = vx;
						if(vy > max[1]) max[1] = vy;
						if(vz > max[2]) max[2] = vz;

						//What does this do?
						if(i%3 == 0){
						bary.push(1,0,0);
						} else if(i % 3 == 1){
								bary.push(0,1,0);
						} else if(i % 3 == 2){
								bary.push(0,0,1);
						}
		});

		//set the min/max variables
		m.minX = min[0]; m.minY = min[1]; m.minZ = min[2];
		m.maxX = max[0]; m.maxY = max[1]; m.maxZ = max[2];

		var indexNormals = [];

		m.indices.forEach(function(d,i){
						indexNormals.push(m.normals[d*3]);
						indexNormals.push(m.normals[d*3+1]);
						indexNormals.push(m.normals[d*3+2]);
						});

		//calculate the largest range in x,y,z
		var s = Math.max( Math.abs(min[0]-max[0]),
						Math.abs(min[1]-max[1]),
						Math.abs(min[2]-max[2]))

				//calculate the distance to place camera from model
				var d = (s/2.0)/Math.tan(45/2.0);

		//place the camera at the calculated position
		camera.position[2] = d;

		//orient the camera to look at the center of the model
		camera.lookAt = [(m.minX+m.maxX)/2.0,(m.minY+m.maxY)/2.0,(m.minZ+m.maxZ)/2.0];

		//bind the data we placed in the bary array to an OpenGL buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, GC.barycentricBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bary), gl.STATIC_DRAW);

		m.vertexBuffer = gl.createBuffer();
		//bind the data we placed in the verts array to an OpenGL buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, m.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		m.vertexNormalsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, m.vertexNormalsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(indexNormals), gl.STATIC_DRAW);
		console.log(camera.position[0],camera.position[1],camera.position[2]);
}
/*
demo.prototype.initNormalsBuffer = function()
{
		var m = GC.mesh.model;
		var indexNormals = [];

  m.indices.forEach(function(d,i){
				indexNormals.push(m.normals[d*3]);
				indexNormals.push(m.normals[d*3+1]);
				indexNormals.push(m.normals[d*3+2]);
				});

		m.vertexNormalsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, m.vertexNormalsBuffer);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(indexNormals), gl.STATIC_DRAW);
}
*/
//the drawing function
function drawScene(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var m = GC.mesh.model

    //setup perspective and lookat matrices
    GC.perspectiveMatrix = makePerspective(45, GC.width/GC.height, 0.1, Math.max(2000.0,m.maxZ));
    var lookAtMatrix = makeLookAt(camera.position[0],camera.position[1],camera.position[2],
                                  camera.lookAt[0],camera.lookAt[1],camera.lookAt[2],
                                  0,1,0);
	//	console.log(camera.position[0],camera.position[1],camera.position[2]);

    //set initial camera lookat matrix
    mvLoadIdentity(GC);

    //multiply by our lookAt matrix
    mvMultMatrix(lookAtMatrix,GC);

//--------- camera rotation matrix multiplicaton
    //translate to origin of model for rotation
    mvTranslate([(m.minX+m.maxX)/2.0,(m.minY+m.maxY)/2.0,(m.minZ+m.maxZ)/2.0],GC);

    mvMultMatrix(camera.Transform,GC);//multiply by the transformation

    //translate back to original origin
    mvTranslate([-(m.minX+m.maxX)/2.0,-(m.minY+m.maxY)/2.0,-(m.minZ+m.maxZ)/2.0],GC);
//---------

    //passes modelview and projection matrices to the vertex shader
    setMatrixUniforms(GC);

				gl.uniform3f(GC.cameraPosAttribute, camera.position[0], camera.position[1], camera.position[2]);

				gl.uniform1f(GC.maxyAttribute, m.maxY);

    //pass the vertex buffer to the shader
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vertexBuffer);
    gl.vertexAttribPointer(GC.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    //pass the barycentric coords to the shader for edge detection
    gl.bindBuffer(gl.ARRAY_BUFFER, GC.barycentricBuffer);
    gl.vertexAttribPointer(GC.barycentricAttribute, 3, gl.FLOAT, false, 0, 0);

				//pass the normals
				gl.bindBuffer(gl.ARRAY_BUFFER, m.vertexNormalsBuffer);
				gl.vertexAttribPointer(GC.normalsAttribute, 3, gl.FLOAT, false, 0, 0);

    //draw everything
    gl.drawArrays(gl.TRIANGLES,0,m.indices.length);

}

//initialize webgl
demo.prototype.initWebGL = function(){
    gl = null;

    try {
        gl = this.canvas.getContext("experimental-webgl");
    }
    catch(e) {
        //pass through
    }

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not suFloat32Array")
						}
}

//compile shader located within a script tag
demo.prototype.getShader = function(id){
    var shaderScript, theSource, currentChild, shader;

    shaderScript = document.getElementById(id);
    if(!shaderScript){
        return null;
    }

    //init the source code variable
    theSource = "";

    //begin reading the shader source from the beginning
    currentChild = shaderScript.firstChild;

    //read the shader source as text
    while(currentChild){
        if(currentChild.nodeType == currentChild.TEXT_NODE){
            theSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    //check type of shader to give openGL the correct hint
    if(shaderScript.type == "x-shader/x-fragment"){
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if(shaderScript.type == "x-shader/x-vertex"){
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
    
    //add the shader source code to the created shader object
    gl.shaderSource(shader, theSource);

    //compile the shader
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        console.log("error compiling shaders -- " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}


//handle mousedown
demo.prototype.mouseDown = function(event){
    GC.mouseDown = true;

    //update the base rotation so model doesn't jerk around upon new clicks
    camera.LastRot = camera.ThisRot;
    camera.click(event.clientX,event.clientY);

    return false;
}

//handle mouseup
demo.prototype.mouseUp = function(event){
    GC.mouseDown = false;
    return false;
}

//handle mouse movement
demo.prototype.mouseMove = function(event){
    if(GC.mouseDown == true){
       X = event.clientX;
       Y = event.clientY;

       //call camera function for handling mouse movement
       camera.move(X,Y)

       drawScene();
    }
    return false;
}

//handle mouse scroll event
demo.prototype.mouseWheel = function(event){
    camera.zoomScale -= event.wheelDeltaY*0.0005;
    camera.Transform.elements[3][3] = camera.zoomScale;

    drawScene();
    return false;
}


//--------- handle keyboard events
demo.prototype.keyDown = function(e){
    camera.LastRot = camera.ThisRot;
    var center = {x: GC.width/2, y:GC.height/2}; 
    var delta = 8;

    switch(e.keyCode){
        case 37: //Left arrow
            camera.click(center.x, center.y);
            camera.move(center.x - delta, center.y);
        break;
        case 38: //Up arrow
            camera.click(center.x, center.y);
            camera.move(center.x, center.y - delta);
        break;
        case 39: //Right arrow
            camera.click(center.x, center.y);
            camera.move(center.x + delta, center.y);
        break;
        case 40: //Down arrow
            camera.click(center.x, center.y);
            camera.move(center.x, center.y + delta);
        break;
    }

    //redraw
    drawScene();
}


// --------- handle touch events
demo.prototype.touchDown = function(event){
    GC.mouseDown = true;

    //update the base rotation so model doesn't jerk around upon new clicks
    camera.LastRot = camera.ThisRot;

    //tell the camera where the touch event happened
    camera.click(event.changedTouches[0].pageX,event.changedTouches[0].pageY);

    return false;
}

//handle touchEnd
demo.prototype.touchUp = function(event){
    GC.mouseDown = false;
    return false;
}

//handle touch movement
demo.prototype.touchMove = function(event){
    if(GC.mouseDown == true){
        X = event.changedTouches[0].pageX;
        Y = event.changedTouches[0].pageY;

       //call camera function for handling mouse movement
       camera.move(X,Y)

       drawScene();
    }
    return false;
}
// --------- end handle touch events
