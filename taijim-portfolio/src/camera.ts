/** Shared state between the network canvas and the project view. */
export const camera = {
  zoom: 0,    // 0 = normal view, 1 = fully zoomed onto the project node
  index: 0,   // which project node the camera is focused on
  hover: -1,  // which node the visitor is hovering (for the glow)
}
