let client;
function sql(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
 if(!client)client=require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
 return client;
}
module.exports={sql};
