const { ethers } = require("hardhat");

async function main() {
  const REFINE_ENGINE = "0x72c165b314fe6142e5d7c16b2d8442bd04487045"; // your deployed contract

  const refine = await ethers.getContractAt(
    "RefineEngineV1_Float",
    REFINE_ENGINE
  );

  console.log("Connected to RefineEngine:", REFINE_ENGINE);

  const buckets = [
    {
      to: "0xD0bd65A463A67C7B04A0521ac62f666808A8253C",
      bps: 4000,
      active: true,
      label: "PUBLIC FLOAT",
    },
    {
      to: "0xcb56f935ccc77ebe6822142d17b645935fd808be",
      bps: 3000,
      active: true,
      label: "PHOENIX VAULT",
    },
    {
      to: "0x6aa61d447430e1984a4710a6b7e95f4499af1194",
      bps: 2000,
      active: true,
      label: "CROWN TREASURY",
    },
    {
      to: "0xccd3884d1458224085770a6946581f13ca181aa5",
      bps: 1000,
      active: true,
      label: "PHOENIX CORE",
    },
  ];

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    console.log(`Adding bucket ${i}: ${b.label}`);

    const tx = await refine.addBucket(b.to, b.bps, b.active, b.label);
    await tx.wait();

    console.log(`✅ Bucket ${i} added`);
  }

  console.log("🎉 All buckets added successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
