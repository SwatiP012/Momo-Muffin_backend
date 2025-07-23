const paypal = require("paypal-rest-sdk");

paypal.configure({
  mode: "sandbox",
  client_id: "AamlIfs2_c3GUx26dNVy3XUPChoZzjJUor21r_KTelp9XLog0sEsHI5UOReuXBSv35JL0fJWVTfqgg2p",
  client_secret: "ECOLDwhKQtG82Ng3tcoyMdNVhdvNPj2RApCdKlst-57449t1tMLUC8uK7wD9fKPK6SSImCgLphXs3sUw",
});

module.exports = paypal;
