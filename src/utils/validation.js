const validator = require('validator');
const isValidated = ({ body }) => {
    // Allowed fields
    const allowedFields = [
        'firstName', 'lastName', 'password', 'phone', 'location', 'age', 'emailId', 'gender', 'role', 'student', 'college', 'clubs'
    ];
    // Check for unexpected fields
    Object.keys(body).forEach(key => {
        if (!allowedFields.includes(key)) {
            throw new Error(`Unexpected field: ${key}`);
        }
    });

    const { firstName, lastName, password, phone, location, age, emailId, gender, role, student, college, clubs } = body;

    // firstName: required, min 4, max 20
    if (!firstName || typeof firstName !== 'string' || firstName.length < 4 || firstName.length > 20) {
        throw new Error('First name must be 4-20 characters');
    }
    // lastName: required, max 20
    if (!lastName || typeof lastName !== 'string' || lastName.length > 20) {
        throw new Error('Last name must be up to 20 characters');
    }
    // password: required, strong
    if (!password || typeof password !== 'string' || !validator.isStrongPassword(password)) {
        throw new Error('Password is invalid or not strong enough');
    }
    // phone: required, min 10, max 15
    if (!phone || typeof phone !== 'string' || phone.length < 10 || phone.length > 15 || !validator.isMobilePhone(phone, 'any')) {
        throw new Error('Phone number is invalid');
    }
    // location: required, min 6, max 100
    if (!location || typeof location !== 'string' || location.length < 6 || location.length > 100) {
        throw new Error('Location must be 6-100 characters');
    }
    // age: required, integer, min 18, max 150
    const numAge = parseInt(age, 10);
    if (!isNaN(numAge) && (!Number.isInteger(numAge) || numAge < 18 || numAge > 150) ) {
        throw new Error('Age must be an integer between 18 and 150');
    }
    // emailId: required, max 30, valid email
    if (!emailId || typeof emailId !== 'string' || emailId.length > 30 || !validator.isEmail(emailId)) {
        throw new Error('Email is invalid or too long');
    }
    // gender: required, must be one of
    if (gender && !['male', 'female', 'others'].includes(gender)) {
        throw new Error('Gender is invalid');
    }
    // role: required, max 15
    if (!role || typeof role !== 'string' || role.length > 15) {
        throw new Error('Role is invalid or too long');
    }
    // // student: required, boolean
    // if (typeof student !== 'boolean') {
    //     throw new Error('Student must be true or false');
    // }
    // college: optional, string, max 70
    if (college !== undefined && (typeof college !== 'string' || college.length > 70)) {
        throw new Error('College must be a string up to 70 characters');
    }
    // clubs: optional, boolean
    if (clubs !== undefined && typeof clubs !== 'boolean') {
        throw new Error('Clubs must be true or false');
    }
};
module.exports = isValidated;