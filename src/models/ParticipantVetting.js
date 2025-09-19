const mongoose = require('mongoose');
const validator = require('validator');

const INTEREST_AREAS = [
    "Volunteering for health-related nonprofits", 
    "Participating in 5K walks, wellness events, or virtual challenges",
    "Learning about self-care, nutrition, or health topics",
    "Sharing my story or journey (video, photo, post, etc.)",
    "Hosting or co-hosting a livestream or podcast",
    "Creating or sharing awareness content on social media", 
    "Supporting causes like mental health, cancer, or veterans", 
    "Helping spread the word about Medwell campaigns", 
    "Earning points to assign to a cause or nonprofit I care about", 
]
const COMMITMENT_OPTIONS = [
    "Complete a short wellness self-assessment ",
    "Participate in a 30–60 min workshop, livestream, or Kahoot ",
    "Submit a user-generated post (video, image, quote, story) ",
    "Refer 2–3 friends to the platform ",
    "Assign points to a nonprofit or cause ",
    "Join a themed month campaign (e.g. Autism, Breast Cancer) ",
    "Volunteer 1–3 hours for a community or awareness event ",
    "Attend a podcast, reel recording, or livestream as a guest or viewer ",
    "Take part in a campus or virtual “Wheel of Impact” game ",
    "Share a testimonial about your experience "
]


const DetailsSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"user", // connects with the usercollection, we can get access to user_doc details
        //index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Emaill is invalid");
            }
        }
    },
    reviewStatus:{
        type:String,
        enum:["hold","accepted", "rejected"],
        default:"hold",
        index:true,
    },
    reviewedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    reviewedAt:{
        type:Date,
    },
    reviewerNotes:{
        type:String
    }
},{timestamps:true}, {discriminatorKey:'role'},{collection:'details'});

const Details = mongoose.model("Details", DetailsSchema);

const ParticipantSchema = new mongoose.Schema({
    interest_areas:{
        type:[{ type: String, enum:INTEREST_AREAS}],
        // required:true,
        default:[]
    },
    commitments:{
        type:[{type:String, enum:COMMITMENT_OPTIONS}],
        validate(arr){
            if(!Array.isArray(arr) || arr.length<5){
                throw new Error("Please Select atleast 5 commitmnet items.")
            }
        },
        default:[]
    },
    goals:{
        causePreference:{
            type:String,
        },
        activityPreference:{
            type:String,
        }
    },
    codeOfParticipation:{
      communityPositive: { type: Boolean, default: false }, //I understand that this is a positive, uplifting community 
      respectfulInclusive: { type: Boolean, default: false }, //I agree to participate in respectful, inclusive ways 
      rewardsUnderstanding: { type: Boolean, default: false }, //I understand that rewards are based on participation, not cash or direct benefits 
      followGuidelines: { type: Boolean, default: false }, //I will follow all guidelines when creating and sharing content 
      committedToWellness: { type: Boolean, default: false }, //I am committed to contributing to wellness, awareness, and social good 
      guardianApproval: { type: Boolean, default: false }, //(If under 18) I have permission from a guardian to participate 
    },
},{_id:false});

const ParticipantDetails = Details.discriminator('participant', ParticipantSchema);

module.exports = {  Details,
                    ParticipantDetails
                    };
