export const formatPhoneNumber = (phoneNumber) => {
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Check if the number starts with "+91" and remove the "+"
    if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
        return phoneNumber; // Already in correct format
    }

    // If the number is 10 digits, prepend "91"
    if (phoneNumber.length === 10) {
        return `91${phoneNumber}`;
    }

    // If the number is not valid, throw an error
    throw new Error('Invalid phone number format');
}
