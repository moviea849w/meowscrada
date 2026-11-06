import { Config } from "@remotion/cli/config";

// 2K vertical, matching the skill's final export (1080x1920 * 1.3333)
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Rendering three.js scenes needs a real browser with WebGL.
// On a 2-core box, keep concurrency low so memory doesn't blow up.
Config.setConcurrency(2);

// Angle/GL backend: swiftshader is the safe choice on headless Linux without a GPU.
Config.setChromiumOpenGlRenderer("swangle");
