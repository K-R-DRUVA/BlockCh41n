const constituency = "District1";
const { address, signature } = await getSignature(constituency);

const payload = {
  username: "voter5",
  address,
  constituency,
  signature
};

// Send to backend
await fetch("http://localhost:3000/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
