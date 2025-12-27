import { createClient } from "@nhost/nhost-js";

const nhost = createClient({
    subdomain: import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw",
    region: import.meta.env.VITE_NHOST_REGION || "ap-south-1",
});

export { nhost };
