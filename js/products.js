/**
 * TechForge Product Catalog
 * Contains 10 curated computer components and peripherals
 */
var PRODUCTS = [
  {
    id: 1,
    name: "ApexPro RGB Mechanical Keyboard",
    category: "peripherals",
    categoryLabel: "Peripherals",
    price: 129.99,
    rating: 4.9,
    reviewCount: 312,
    stock: 45,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
    description: "Premium aircraft-grade aluminum mechanical keyboard featuring hot-swappable tactile switches, per-key RGB illumination, and sound-dampening silicone foam for the ultimate typing and gaming experience.",
    specs: [
      "Switches: Hot-swappable Custom Mechanical Tactile",
      "Connectivity: Detachable Braided USB-C & Bluetooth 5.2",
      "Backlighting: 16.8M Per-Key RGB with onboard memory",
      "Keycaps: Double-shot PBT Cherry Profile",
      "Polling Rate: Ultra-fast 1000Hz (1ms response)"
    ]
  },
  {
    id: 2,
    name: "ViperStrike Wireless Gaming Mouse",
    category: "peripherals",
    categoryLabel: "Peripherals",
    price: 69.99,
    rating: 4.8,
    reviewCount: 245,
    stock: 60,
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80",
    description: "Ultra-lightweight 58g ergonomic esports mouse equipped with a 26,000 DPI optical sensor, optical switches rated for 90 million clicks, and zero-latency wireless connectivity.",
    specs: [
      "Sensor: Focus Pro 26,000 DPI Optical",
      "Weight: Ultra-light 58 grams honeycomb-free chassis",
      "Battery Life: Up to 90 continuous hours on a single charge",
      "Switches: Gen-3 Optical switches (0.2ms actuation)",
      "Skates: 100% Virgin PTFE rounded feet"
    ]
  },
  {
    id: 3,
    name: "UltraView 27\" 4K IPS Gaming Monitor",
    category: "displays",
    categoryLabel: "Displays",
    price: 349.99,
    rating: 4.9,
    reviewCount: 189,
    stock: 22,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
    description: "Stunning 27-inch 4K UHD (3840x2160) Fast-IPS display with 144Hz refresh rate, 1ms response time, VESA DisplayHDR 400 certification, and 98% DCI-P3 color gamut for pro creators and gamers.",
    specs: [
      "Resolution & Size: 27-inch 4K UHD (3840 x 2160)",
      "Panel Type: Fast IPS with 178° viewing angles",
      "Refresh & Response: 144Hz refresh rate, 1ms GtG",
      "Color Accuracy: 98% DCI-P3, factory color calibrated",
      "Ports: 2x HDMI 2.1, 1x DP 1.4, USB-C 65W PD"
    ]
  },
  {
    id: 4,
    name: "ErgoLift Aluminum Laptop Stand",
    category: "accessories",
    categoryLabel: "Accessories",
    price: 39.99,
    rating: 4.7,
    reviewCount: 156,
    stock: 80,
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    description: "Precision CNC-machined aerospace aluminum laptop stand with dual-axis height and angle adjustment. Features silicone anti-slip pads and open ventilated hollows for maximum thermal cooling.",
    specs: [
      "Material: Solid Aerospace Aluminum Alloy",
      "Adjustment: 360° Rotatable Base + Dual Height Hinges",
      "Compatibility: Fits laptops and tablets 10\" to 17.3\"",
      "Cooling: Hollow heat dissipation airflow design",
      "Load Capacity: Supports up to 10 kg (22 lbs)"
    ]
  },
  {
    id: 5,
    name: "HyperDrive 2TB NVMe PCIe 4.0 SSD",
    category: "components",
    categoryLabel: "Components",
    price: 149.99,
    rating: 4.9,
    reviewCount: 420,
    stock: 35,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
    description: "Blazing fast PCIe Gen4 x4 M.2 2280 internal solid-state drive delivering read speeds up to 7,400 MB/s. Comes with a low-profile graphene heat spreader for cool, sustained high-bandwidth performance.",
    specs: [
      "Form Factor: M.2 2280 NVMe PCIe Gen 4.0 x4",
      "Sequential Read/Write: Up to 7400 MB/s / 6800 MB/s",
      "Capacity: 2TB 3D TLC NAND Flash",
      "Endurance: 1200 TBW (Terabytes Written)",
      "Compatibility: PC, Laptops & PlayStation 5"
    ]
  },
  {
    id: 6,
    name: "FuryVengeance 32GB DDR5 6000MHz RAM",
    category: "components",
    categoryLabel: "Components",
    price: 119.99,
    rating: 4.8,
    reviewCount: 204,
    stock: 50,
    image: "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=800&q=80",
    description: "Dual-channel 32GB (2 x 16GB) DDR5 high-speed desktop memory kit running at 6000MHz with tight CL30 timings. Features aluminum heat spreaders and Intel XMP 3.0 / AMD EXPO profile support.",
    specs: [
      "Configuration: 32GB Kit (2 x 16GB Modules)",
      "Speed & Timings: DDR5 6000MT/s, CL30-36-36-76",
      "Overclocking: Intel XMP 3.0 & AMD EXPO 1-click profiles",
      "Voltage: 1.35V with on-die ECC stability",
      "Heatspreader: Anodized matte black aluminum"
    ]
  },
  {
    id: 7,
    name: "GeForce RTX 4070 Ti Super 16GB GPU",
    category: "components",
    categoryLabel: "Components",
    price: 799.99,
    rating: 5.0,
    reviewCount: 512,
    stock: 12,
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80",
    description: "Flagship-tier graphics powerhouse featuring Ada Lovelace architecture, 8448 CUDA cores, 16GB high-speed GDDR6X VRAM, full ray tracing acceleration, and DLSS 3.5 AI frame generation.",
    specs: [
      "Architecture: NVIDIA Ada Lovelace (4nm TSMC)",
      "VRAM: 16GB GDDR6X on a 256-bit bus",
      "Boost Clock: 2610 MHz",
      "AI & Ray Tracing: 4th Gen Tensor Cores & 3rd Gen RT Cores",
      "Cooling: Triple Axial-tech fans with 0dB silent idle"
    ]
  },
  {
    id: 8,
    name: "ClearCast Pro 4K Streaming Webcam",
    category: "peripherals",
    categoryLabel: "Peripherals",
    price: 89.99,
    rating: 4.7,
    reviewCount: 98,
    stock: 40,
    image: "https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?auto=format&fit=crop&w=800&q=80",
    description: "Ultra-sharp 4K Ultra HD webcam with Sony STARVIS CMOS sensor, fast phase-detection autofocus, dual AI noise-canceling stereo microphones, and physical magnetic privacy shutter.",
    specs: [
      "Sensor: 1/2.8\" Sony STARVIS CMOS",
      "Resolution & FPS: 4K @ 30 FPS / 1080p @ 60 FPS",
      "Microphones: Dual omnidirectional beamforming mics with AI noise reduction",
      "Field of View: Adjustable 65° / 78° / 90° FOV",
      "Mount: Universal monitor clip and standard 1/4\" tripod thread"
    ]
  },
  {
    id: 9,
    name: "SoundBlast 7.1 Spatial Audio Headset",
    category: "accessories",
    categoryLabel: "Accessories",
    price: 84.99,
    rating: 4.8,
    reviewCount: 167,
    stock: 30,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
    description: "Ultra-comfortable wireless gaming headset featuring custom 50mm neodymium audio drivers, THX 7.1 spatial surround sound, plush memory foam ear cushions, and a broadcast-quality flip-to-mute mic.",
    specs: [
      "Drivers: Custom 50mm Neodymium magnet drivers",
      "Audio: 7.1 Spatial Surround Sound with 24-bit/96kHz DAC",
      "Wireless: 2.4GHz lossless wireless + 3.5mm analog jack",
      "Battery Life: Up to 50 hours per charge with fast USB-C charge",
      "Microphone: Discord-certified cardioid detachable boom mic"
    ]
  },
  {
    id: 10,
    name: "OmniPort 10-in-1 USB-C Hub Dock",
    category: "accessories",
    categoryLabel: "Accessories",
    price: 54.99,
    rating: 4.9,
    reviewCount: 230,
    stock: 75,
    image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=800&q=80",
    description: "Versatile aluminum multi-port adapter expanding a single USB-C port into Dual 4K HDMI, 100W Power Delivery pass-through charging, Gigabit Ethernet, SD/TF card readers, and USB 3.2 10Gbps data ports.",
    specs: [
      "Video Output: Dual HDMI 4K @ 60Hz (Extended/Mirror display)",
      "Power Delivery: 100W USB-C Power Delivery 3.0 Pass-Through",
      "Networking: RJ45 Gigabit Ethernet 10/100/1000 Mbps",
      "Data: 3x USB 3.2 Gen 2 (up to 10 Gbps) + SD/MicroSD card slots",
      "Build: Space Gray milled aluminum heat-dissipating shell"
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRODUCTS;
}
