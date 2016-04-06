if (typeof String.prototype.startsWith !== 'function') {
		String.prototype.startsWith = function (str){
				return this.slice(0, str.length) === str;
		};
}
var modelLoader = {};

modelLoader.Mesh = function( objectData ){
		/*
					With the given elementID or string of the OBJ, this parses the
					OBJ and creates the mesh.
					*/

		var verts = [];

		// unpacking stuff
		var packed = {};
		packed.indices = [];

		// array of lines separated by the newline
		var lines = objectData.split( '\n' )
				for( var i=0; i<lines.length; i++ ){

						lines[i] = lines[i].replace(/\s{2,}/g, " "); // remove double spaces

						// if this is a vertex
						if( lines[ i ].startsWith( 'v ' ) ){
								line = lines[ i ].slice( 2 ).split( " " )
										verts.push( line[ 0 ] );
								verts.push( line[ 1 ] );
								verts.push( line[ 2 ] );
						}
						// if this is a vertex normal
						else if( lines[ i ].startsWith( 'vn' ) ){
								document.write(lines[i]);
						}
						// if this is a texture
						else if( lines[ i ].startsWith( 'vt' ) ){
						}
						// if this is a face
						else if( lines[ i ].startsWith( 'f ' ) ){
								line = lines[ i ].slice( 2 ).split( " " );
								for(var j=1; j <= line.length-2; j++){
										var i1 = line[0].split('/')[0] - 1;
										var i2 = line[j].split('/')[0] - 1;
										var i3 = line[j+1].split('/')[0] - 1;
										packed.indices.push(i1,i2,i3);
								}
						}
				}
		this.vertices = verts;
		this.indices = packed.indices;
		this.normals = norm(verts, this.indices);
}

function norm(verts, indices)
{
		var vR = [0.0, 0.0, 0.0];
		var v1, v2, v3;
		var i;
		var normals = [];
		var vertTotal = Array(verts.length);

		for (i = 0; i < verts.length; i++)
		{
				vertTotal[i] = [0.0, 0.0, 0.0];
		}

		for (i = 0; i < indices.length; i+=3)
		{
				v1 = [parseFloat(verts[indices[i]*3]), parseFloat(verts[indices[i]*3+1]), 
							parseFloat(verts[indices[i]*3+2])];
				v2 = [parseFloat(verts[indices[i+1]*3]), parseFloat(verts[indices[i+1]*3+1]),
							parseFloat(verts[indices[i+1]*3+2])];
				v3 = [parseFloat(verts[indices[i+2]*3]), parseFloat(verts[indices[i+2]*3+1]),
							parseFloat(verts[indices[i+2]*3+2])];

				var p = [];
				var q = [];

				for (var j = 0; j < 3; j++)
				{
						p.push(v2[j]-v1[j]);
						q.push(v3[j]-v1[j]);
				}
				var n = cross(p, q);

				var a = Math.sqrt(Math.pow(n[0], 2) + Math.pow(n[1], 2) + Math.pow(n[2], 2));

				for (var j = 0; j < 3; j++)
				{
						n[j] /= a;
						vertTotal[indices[i]][j] += n[j];
						vertTotal[indices[i+1]][j] += n[j];
						vertTotal[indices[i+2]][j] += n[j];
				}
		}	
		var d;
		for (i = 0; i < vertTotal.length; i++)
		{
				d = Math.sqrt(Math.pow(vertTotal[i][0], 2) + Math.pow(vertTotal[i][1], 2) + Math.pow(vertTotal[i][2],2));
				normals.push(vertTotal[i][0] / d);
				normals.push(vertTotal[i][1] / d);
				normals.push(vertTotal[i][2] / d);
		}

		return normals;	
}
