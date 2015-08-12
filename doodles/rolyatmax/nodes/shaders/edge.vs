precision mediump float;

attribute vec4 position;
attribute vec4 velocity;

varying vec2 v_position;
varying float v_opacity;

uniform vec2 u_mouse;
uniform float u_time;
uniform float u_threshold;

float dist(vec2 a, vec2 b) {
    float x_diff = a.x - b.x;
    float y_diff = a.y - b.y;
    return sqrt(x_diff * x_diff + y_diff * y_diff);
}

float tri(float x) {
    return 2.0 * abs(2.0 * (x - floor(x + 0.5))) - 1.0;
}

vec2 get_position(vec2 p, vec2 v, float t) {
    v = sin(v * 3.0);
    float mouseX = u_mouse.x * 0.01;
    float mouseY = u_mouse.y * 0.01;
    vec2 pos = vec2(mouseX, mouseY) + p + v * t;

    float x = sin(pos.x * 4.0);
    float y = sin(pos.y * 4.0);

    float xSign = x / abs(x);
    float ySign = y / abs(y);

    if (p.x > 0.0) {
        x = (0.6 - pow(x, 1.2)) * 0.95;
        y = (0.6 - pow(y, 1.2)) * 0.95;
    } else {
        x = (1.0 - pow(x, 1.2)) * 0.95;
        y = (1.0 - pow(y, 1.2)) * 0.95;
    }

    x *= xSign;
    y *= ySign;

    return vec2(x, y);
}

void main() {
    vec2 pos1 = get_position(position.xy, velocity.xy, u_time);
    vec2 pos2 = get_position(position.zw, velocity.zw, u_time);

    v_position = pos1;
    float distance = dist(pos1, pos2);
    if (distance < u_threshold) {
        v_opacity = 1.0 - distance / u_threshold;
        gl_Position = vec4(pos1, 0, 1);
    } else {
        v_opacity = 0.0;
        gl_Position = vec4(0, 0, 0, 1);
    }
}
