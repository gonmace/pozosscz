const m=()=>{const a=document.getElementById("searchClientButton"),e=document.getElementById("searchClientModal"),l=document.getElementById("closeSearchModal"),c=document.getElementById("searchClientInput"),t=document.getElementById("searchResults");if(!a||!e||!l||!c||!t){console.error("Required elements not found");return}a.addEventListener("click",()=>{e.showModal(),c.focus()}),l.addEventListener("click",()=>{e.close()}),e.addEventListener("keydown",n=>{n.key==="Escape"&&e.close()});const u=async n=>{try{const d=await(await fetch(`/api/v1/clientes/search/?q=${encodeURIComponent(n)}`)).json();if(t.innerHTML="",d.length===0){t.innerHTML='<p class="text-center text-gray-500">No se encontraron resultados</p>';return}d.forEach(o=>{const r=document.createElement("div");r.className="p-2 hover:bg-gray-100 cursor-pointer",r.innerHTML=`
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-medium">${o.name||"Sin nombre"}</p>
                            <p class="text-sm text-gray-600">${o.tel1||"Sin teléfono"}</p>
                        </div>
                        <p class="text-sm font-medium">${o.cost} Bs.</p>
                    </div>
                `,r.addEventListener("click",()=>{e.close()}),t.appendChild(r)})}catch(s){console.error("Error searching clients:",s),t.innerHTML='<p class="text-center text-red-500">Error al buscar clientes</p>'}};let i;c.addEventListener("input",n=>{clearTimeout(i),i=setTimeout(()=>{const s=n.target.value.trim();s.length>=3?u(s):t.innerHTML='<p class="text-center text-gray-500">Ingrese al menos 3 caracteres</p>'},300)})};export{m as initSearchClientButton};
