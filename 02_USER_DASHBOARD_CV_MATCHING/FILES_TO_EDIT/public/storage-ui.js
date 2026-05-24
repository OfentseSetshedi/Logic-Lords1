(function(){
  function injectProfilePictureUpload(){
    const cvForm = document.getElementById('cv-form');
    if(!cvForm || document.getElementById('profile-picture-form')) return;
    const box = document.createElement('form');
    box.id = 'profile-picture-form';
    box.className = 'cv-form';
    box.style.marginTop = '12px';
    box.innerHTML = '<label class="cv-drop" for="profile-picture-file"><div class="cv-drop-icon">🖼️</div><div class="cv-drop-title">Profile picture</div><div class="cv-drop-sub" id="profile-picture-sub">Choose JPG, PNG or WEBP</div><input id="profile-picture-file" type="file" accept=".jpg,.jpeg,.png,.webp" hidden /></label><button class="btn btn-outline" type="submit">Upload profile picture</button><div id="profile-picture-info" class="section-sub" style="margin-top:8px"></div>';
    cvForm.insertAdjacentElement('afterend', box);
    const file = box.querySelector('#profile-picture-file');
    const sub = box.querySelector('#profile-picture-sub');
    file.addEventListener('change',()=>{ if(file.files[0]) sub.textContent = file.files[0].name; });
    box.addEventListener('submit', async e=>{
      e.preventDefault();
      if(!file.files[0]) return alert('Choose a profile picture first.');
      const formData = new FormData();
      formData.append('profilePicture', file.files[0]);
      const res = await fetch('/api/profile/upload-profile-picture', { method:'POST', credentials:'include', body:formData });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) return alert(data.message || 'Profile picture upload failed.');
      box.querySelector('#profile-picture-info').textContent = '✅ Profile picture saved in Supabase Storage.';
    });
  }
  document.addEventListener('DOMContentLoaded', injectProfilePictureUpload);
})();
