/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */

function calculateTotalPrice(products) {
  let totalPrice = 0;

  for (let i = 0; i < products.length; i++) {
    totalPrice += products[i].price;
  }

  return totalPrice;
}

function calculateTotalPlrice(products) {
  return products.reduce((total, product) => total + product.price, 0);
}

function calculateTotalPrice1(products) {
  if (!Array.isArray(products))
    throw new TypeError('Expected an array of products');

  return products.reduce((total, product) => {
    if (typeof product.price !== 'number')
      throw new TypeError('Expected product price to be a number');

    return total + product.price;
  }, 0);
}
