// Color identity for the packing screen — separate from categoryTheme
// because the need here is different: category colors identify *what*
// a product is, but on the packing screen every card is already dark
// maroon/black (surface-3d, bg-black/20) so one customer's block reads
// identically to the next, and two orders stacked under the same
// customer read as one repeated block. These palettes exist purely so
// the operator's eye can separate "customer A's box" from "customer
// B's box", and "order 1" from "order 2" within the same box, at a
// glance while scrolling a long list.

// One accent per customer cluster — cycled by list position so
// consecutive customers never land on the same color, and stable
// across re-renders since it's keyed off position in the (stably
// sorted) cluster list rather than anything random.
const CLUSTER_PALETTE = [
  { from: '#FFCC80', to: '#F57C00', solid: '#FFA726', wash: 'rgba(255, 167, 38, 0.10)' },
  { from: '#81D4FA', to: '#0288D1', solid: '#4FC3F7', wash: 'rgba(79, 195, 247, 0.10)' },
  { from: '#CE93D8', to: '#7B1FA2', solid: '#BA68C8', wash: 'rgba(186, 104, 200, 0.10)' },
  { from: '#A5D6A7', to: '#2E7D32', solid: '#66BB6A', wash: 'rgba(102, 187, 106, 0.10)' },
  { from: '#FF8A80', to: '#C62828', solid: '#FF5252', wash: 'rgba(255, 82, 82, 0.10)' },
  { from: '#80CBC4', to: '#00695C', solid: '#4DB6AC', wash: 'rgba(77, 182, 172, 0.10)' },
];

export function getClusterAccent(index = 0) {
  return CLUSTER_PALETTE[index % CLUSTER_PALETTE.length];
}

// Two clearly-different tones for order cards stacked inside one
// unmerged cluster — order 1 warm, order 2 cool, order 3 loops back.
// Deliberately higher-contrast against each other than the cluster
// palette above, since these two sit directly on top of one another.
const ORDER_SLOT_PALETTE = [
  { label: 'Order 1', tint: 'rgba(255, 152, 0, 0.09)', edge: 'rgba(255, 167, 38, 0.55)', badge: 'text-[#ffb74d] border-[#ffb74d]/40 bg-[#ffb74d]/10' },
  { label: 'Order 2', tint: 'rgba(41, 182, 246, 0.09)', edge: 'rgba(79, 195, 247, 0.55)', badge: 'text-[#4fc3f7] border-[#4fc3f7]/40 bg-[#4fc3f7]/10' },
  { label: 'Order 3', tint: 'rgba(186, 104, 200, 0.09)', edge: 'rgba(186, 104, 200, 0.55)', badge: 'text-[#ba68c8] border-[#ba68c8]/40 bg-[#ba68c8]/10' },
  { label: 'Order 4', tint: 'rgba(102, 187, 106, 0.09)', edge: 'rgba(102, 187, 106, 0.55)', badge: 'text-[#66bb6a] border-[#66bb6a]/40 bg-[#66bb6a]/10' },
];

export function getOrderSlot(index = 0) {
  return ORDER_SLOT_PALETTE[index % ORDER_SLOT_PALETTE.length];
}
