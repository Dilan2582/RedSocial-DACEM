// Funcionalidad de búsqueda
console.log('Script de búsqueda cargado');

// Esperar a que el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: Iniciando búsqueda...');
  
  const gsInput = document.getElementById('topSearch');
  const gsResults = document.getElementById('topSearchResults');

  if (!gsInput || !gsResults) {
    console.error('No se encontraron los elementos de búsqueda:', {
      input: gsInput,
      results: gsResults
    });
    return;
  }

  console.log('Elementos de búsqueda encontrados y listos');

// Funciones auxiliares
function gsShow(flag) {
  gsResults.classList.toggle('show', !!flag);
}

function gsClear() {
  if(gsResults) {
    gsResults.innerHTML = '';
    gsShow(false);
  }
}

function userRowHTML(u) {
  const id = u._id || u.id;
  const name = u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'Usuario';
  const nick = u.nickname || (u.email ? u.email.split('@')[0] : 'usuario');
  const avatar = u.avatar || 'img/Dacem.png';
  
  return `
    <div class="top-search-item" data-id="${id}">
      <img src="${avatar}" alt="">
      <div>
        <div style="font-weight:700">${name}</div>
        <div class="nick">@${nick}</div>
      </div>
    </div>`;
}

// Eventos y lógica de búsqueda
let gsTimer = null;
gsInput?.addEventListener('input', async () => {
  console.log('Input event triggered');
  const q = gsInput.value.trim();
  console.log('Búsqueda:', q);
  clearTimeout(gsTimer);
  if (!q) {
    console.log('Query vacío, limpiando resultados');
    gsClear();
    return;
  }

  gsTimer = setTimeout(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Presente' : 'No encontrado');
      
      const r = await fetch(`/api/user/search?q=${encodeURIComponent(q)}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Respuesta de la API:', r.status);
      const data = await r.json();
      const users = data.users || [];

      if (!users.length) {
        gsClear();
        return;
      }

      gsResults.innerHTML = users.map(userRowHTML).join('');
      gsShow(true);

      // Agregar eventos click a los resultados
      gsResults.querySelectorAll('.top-search-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-id');
          if (id) location.href = `profile.html?id=${encodeURIComponent(id)}`;
        });
      });
    } catch(err) {
      console.error('Error en búsqueda:', err);
      gsClear();
    }
  }, 300);
});

// Cerrar resultados al hacer click fuera
document.addEventListener('click', (e) => {
  if (!gsResults) return;
  if (e.target === gsInput || gsResults.contains(e.target)) return;
  gsClear();
});

}); // Cierre del DOMContentLoaded