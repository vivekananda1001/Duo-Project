export default function generateRandomString(length = 8) {
    const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const specialChars = "!@#$%^&*()_+[]{}|;:,.<>?";
    
    const allChars = upperCaseChars + lowerCaseChars + numberChars + specialChars;
    let randomString = "";

    randomString += upperCaseChars[Math.floor(Math.random() * upperCaseChars.length)];
    randomString += lowerCaseChars[Math.floor(Math.random() * lowerCaseChars.length)];
    randomString += numberChars[Math.floor(Math.random() * numberChars.length)];
    randomString += specialChars[Math.floor(Math.random() * specialChars.length)];

    for (let i = 4; i < length; i++) {
        randomString += allChars[Math.floor(Math.random() * allChars.length)];
    }


    randomString = randomString.split('').sort(() => Math.random() - 0.5).join('');
    
    return randomString;
}

