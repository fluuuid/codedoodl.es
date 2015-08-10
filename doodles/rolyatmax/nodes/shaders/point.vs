precision mediump float;

attribute vec2 position;
attribute vec2 velocity;

uniform vec2 u_mouse;
uniform float u_time;

varying vec2 v_position;

void main() {
    vec2 v = sin(velocity * 3.0);
    float mouseX = u_mouse.x * 0.01;
    float mouseY = u_mouse.y * 0.01;
    vec2 pos = vec2(mouseX, mouseY) + position + v * u_time;

    float x = sin(pos.x * 4.0);
    float y = sin(pos.y * 4.0);

    float xSign = x / abs(x);
    float ySign = y / abs(y);

    if (position.x > 0.0) {
        x = (0.6 - pow(x, 1.2)) * 0.95;
        y = (0.6 - pow(y, 1.2)) * 0.95;
    } else {
        x = (1.0 - pow(x, 1.2)) * 0.95;
        y = (1.0 - pow(y, 1.2)) * 0.95;
    }

    x *= xSign;
    y *= ySign;

    v_position = vec2(x, y);

    gl_PointSize = 2.0;
    gl_Position = vec4(x, y, 0, 1);
}
