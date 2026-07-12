const { hashPassword, comparePassword } = require("./src/utils/hash");

async function test() {
    const password = "Admin@123";

    const hash = await hashPassword(password);

    console.log(hash);

    const match = await comparePassword(password, hash);

    console.log(match);
}

test();