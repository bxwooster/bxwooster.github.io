/*

The intention right now is to create a small compiler/interpreter
	for simple numerical expressions. Details will follow.

*/

var ANIMATE = true;

var g_definition = {
	0: [":", 10, 2],
	2: [":", 11, 3],
	3: [":", 12, 4],
	4: "[]",
	10: ["arc", 20, 21, 100],
	11: ["segment", 21, 22],
	12: ["segment", 20, 22],
	20: ["vector-from-x-y", 30, 31],
	21: ["vector-from-x-y", 112, 113],
	22: ["vector-from-x-y", 32, 33],
	30: ["+", 101, 40],
	31: ["+", 101, 41],
	32: ["+", 101, 41],
	33: ["+", 101, 40],
	40: ["*", 50, 101],
	41: ["*", 51, 101],
	50: ["sin", 60],
	51: ["cos", 60],
	60: ["/", 1, 102],
	100: Math.PI * 0.6,
	101: 100,
	102: 60,
	103: 200,
	112: 200,
	113: 200,
};

var function_definitions = {
	"g": g_definition,
};

var builtins = {
	"+": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.f = a.f + b.f; }},
	"-": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.f = a.f - b.f; }},
	"*": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.f = a.f * b.f; }},
	"/": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.f = a.f / b.f; }},
	"sin": {n: 1, f: function(x, a) { xeval(a); x.f = Math.sin(a.f); }},
	"cos": {n: 1, f: function(x, a) { xeval(a); x.f = Math.cos(a.f); }},
	"vector-from-x-y": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.x = a.f; x.y = b.f; }}, // unboxed
	"bezier": {n: 4, f: function(x, a, b, c, d) {
		xeval(a); xeval(b); xeval(c); xeval(d);
		x.e = 0; x.p = a; x.v = b; x.w = c; x.q = d; }},
	"segment": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.e = 1; x.p = a; x.q = b; }},
	"arc": {n: 3, f: function(x, a, b, c) {
		xeval(a); xeval(b); xeval(c);
		x.e = 2; x.p = a; x.q = b; x.a = c; }},
	":": {n: 2, f: function(x, a, b) { xeval(a); xeval(b); x.e = 1; x.h = a; x.t = b; }},
};

function assert(condition) {
	if (!condition) {
		throw new Error("Assertion failed!");
	}
}

function xeval(gizmo) {
	if (gizmo.__closure__) {
		gizmo.__closure__();
		delete gizmo.__closure__;
	}
}

function build_builtin_expression(builtin, expr, context) {
	if (builtin.n == 1) {
		var f = builtin.f;
		var a = get_gizmo_from_node(expr[1], context);
		return { __closure__: function () { f(this, a); } };
	}
	if (builtin.n == 2) {
		var f = builtin.f;
		var a = get_gizmo_from_node(expr[1], context);
		var b = get_gizmo_from_node(expr[2], context);
		return { __closure__: function () { f(this, a, b); } };
	}
	if (builtin.n == 3) {
		var f = builtin.f;
		var a = get_gizmo_from_node(expr[1], context);
		var b = get_gizmo_from_node(expr[2], context);
		var c = get_gizmo_from_node(expr[3], context);
		return { __closure__: function () { f(this, a, b, c); } };
	}
	assert(false);
}

function get_gizmo_from_node(node, context) {
	var processed = context.boxes[node];
	if (processed) return processed;
	var created = new_gizmo_from_expression(context.source_tree[node], context);
	context.boxes[node] = created;
	return created;
}

function new_gizmo_from_expression(expr, context) {
	if (typeof(expr) == "number") {
		return {
			f: expr,
		};
	}

	if (typeof(expr) == "string") {
		if (expr == "[]") {
			return {
				e: 0,
			}
		}
	}

	assert(context);
	assert(context.source_tree);
	assert(context.boxes);

	if (typeof(expr) == "object") {
		var len = expr.length;
		var head = expr[0];
		assert(head);
		assert(typeof(head) == "string");

		var builtin = builtins[head];
		if (builtin) {
			return build_builtin_expression(builtin, expr, context);
		}

		// not built-in
		var new_boxes = new Array();
		for (var i = 1; i < len; i++) {
			var node = expr[i];
			new_boxes[i] = get_gizmo_from_node(node, context);
		}
		var new_source_tree = function_definitions[head];
		var new_expr = new_source_tree[0];
		var new_context = {
			source_tree: new_source_tree,
			boxes: new_boxes,
		}
		return new_gizmo_from_expression(new_expr, new_context);
	}

	assert(false);
}

/* Small script that tests the above */

function main() {
	var start = new Date();
	console.log("It's " + start.toLocaleTimeString() + "...");

	var canvas = document.getElementById("a");
	var ctx = canvas.getContext("2d");

	var offscreen = document.createElement("canvas");
	offscreen.width = canvas.width;
	offscreen.height = canvas.height;
	var off_ctx = offscreen.getContext("2d");

	var frame = 0;
	function loop() {
		var links = new Array();
		var context = {
			boxes: new Array(),
			source_tree: {1: frame},
		}
		var gizmo = new_gizmo_from_expression(["g", 1], context);
		xeval(gizmo);

		var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
		off_ctx.putImageData(img, 0, 0);

		canvas.width = canvas.width; //erase
		ctx.globalAlpha = 253.0 / 255.0; // minimum, it seems
		ctx.drawImage(offscreen, 0, 0);
		ctx.globalAlpha = 1.0;

		var it = gizmo;
		while (it.e == 1) {
			var head = it.h;
			assert(head);
			if (head.e == 0) { // bezier
				ctx.beginPath();
				ctx.moveTo(head.p.x, head.p.y);
				ctx.bezierCurveTo(head.v.x, head.v.y, head.w.x, head.w.y, head.q.x, head.q.y);
				ctx.stroke();
			}
			if (head.e == 1) { // segment
				//console.log("segment", head.p.x, head.p.y, head.q.x, head.q.y);
				ctx.beginPath();
				ctx.moveTo(head.p.x, head.p.y);
				ctx.lineTo(head.q.x, head.q.y);
				ctx.stroke();
			}
			if (head.e == 2) { // arc
				//console.log("arc", head.p.x, head.p.y, head.q.x, head.q.y, head.a.f);
				var kappa = 0.5 / Math.tan(head.a.f * 0.5);
				var p = head.p;
				var q = head.q;
				var cx = 0.5 * (p.x + q.x) + kappa * (p.y - q.y);
				var cy = 0.5 * (p.y + q.y) + kappa * (q.x - p.x);
				var rx = p.x - cx;
				var ry = p.y - cy;
				var r = Math.sqrt(rx * rx + ry * ry);
				var a0 = Math.atan2(ry, rx);
				ctx.beginPath();
				ctx.arc(cx, cy, r, a0, a0 + head.a.f, false);
				ctx.stroke();
			}

			it = it.t; // tail
		}
		frame = frame + 1;
		if (ANIMATE) requestAnimationFrame(loop);
	}

	loop();
}

main();