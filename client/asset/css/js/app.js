const togglePassword = document.getElementById("togglePassword");
const loginPassword = document.getElementById("loginPassword");

if(togglePassword && loginPassword){

    togglePassword.addEventListener("click", function(){

        if(loginPassword.type === "password"){

            loginPassword.type = "text";

            togglePassword.classList.remove("fa-eye");

            togglePassword.classList.add("fa-eye-slash");

        }else{

            loginPassword.type = "password";

            togglePassword.classList.remove("fa-eye-slash");

            togglePassword.classList.add("fa-eye");

        }

    });

}

const loginForm = document.getElementById("loginForm");

if(loginForm){

    loginForm.addEventListener("submit", function(event){

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;

        if(email && password){

            alert("Login page is working!");

        }

    });

}