require('dotenv').config();
const { User } = require('./src/models');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const resetPassword = async () => {
    rl.question('Ingrese el email del usuario a recuperar: ', async (email) => {
        try {
            const user = await User.findOne({ where: { email } });

            if (!user) {
                console.log('❌ Usuario no encontrado.');
                process.exit(1);
            }

            console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})`);

            rl.question('Ingrese la nueva contraseña: ', async (password) => {
                const hashedPassword = await bcrypt.hash(password, 10);

                // Force update bypassing model hooks if any, though standard update is fine
                user.password_hash = hashedPassword;
                await user.save();

                console.log('✅ Contraseña actualizada correctamente.');
                console.log('Ahora puede iniciar sesión.');
                process.exit(0);
            });

        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });
};

resetPassword();
