const inp_todo = document.getElementById("inp_todo");
const save_todo = document.getElementById("save_todo");
const new_modal = document.getElementById("new_modal");
const btn_open_mdl_new_todo = document.getElementById("btn_open_mdl_new_todo");
const todo_modal = document.getElementById("todo_modal");
const modal_close = document.getElementById("modal_close");
const modal_save = document.getElementById("modal_save");
const modal_delete = document.getElementById("modal_delete");
const modal_done_check = document.getElementById("modal_done_check");
let todos = [];
let countdownInterval = null;
let activeTodoId = null;
let draggingId = null;

class Todo {
  constructor(name, done, description, due_date, priority = "normal") {
    this.id = Math.random().toString(36).substr(2, 9);
    this.name = name;
    this.done = false;
    this.description = description;
    this.due_date = due_date;
    this.priority = priority;
  }
}

save_todo.addEventListener("click", () => {
  const descr = document.getElementById("inp_description");
  const inp_due_date = document.getElementById("inp_due_date");

  // Check input
  if (inp_todo.value != "") {
    add_todo(inp_todo.value, descr.value, inp_due_date.value);
    console.log(todos);

    inp_todo.value = "";
    descr.value = "";
    inp_due_date.value = "";
    close_modal();
  }
});

btn_open_mdl_new_todo.addEventListener("click", () => {
  open_modal();
});

function add_todo(todo, descr, due_date) {
  todos.push(new Todo(todo, false, descr, due_date));
  save_into_storage();
  render_todos();
}

function render_todos() {
  const lists = {
    low: document.getElementById("list_low"),
    normal: document.getElementById("list_normal"),
    high: document.getElementById("list_high"),
  };
  lists.low.innerHTML = "";
  lists.normal.innerHTML = "";
  lists.high.innerHTML = "";

  // Todos ohne Datum ans Ende, innerhalb jeder Spalte nach Datum sortieren
  const sorted = [...todos].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  for (const t of sorted) {
    const todo_element = document.createElement("li");
    const due = t.due_date
      ? new Date(t.due_date).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    todo_element.innerHTML = `<span class="todo-name">${t.name}</span>${due ? `<span class="todo-due">${due}</span>` : ""}`;
    todo_element.classList.add("todo-element");
    if (t.done) todo_element.classList.add("todo-done");
    if (
      !t.done &&
      t.due_date &&
      new Date(
        t.due_date.includes("T") ? t.due_date : t.due_date + "T23:59:59",
      ) < new Date()
    )
      todo_element.classList.add("todo-overdue");
    todo_element.dataset.id = t.id;
    todo_element.draggable = true;

    todo_element.addEventListener("dragstart", (e) => {
      draggingId = t.id;
      todo_element.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    todo_element.addEventListener("dragend", () => {
      todo_element.classList.remove("dragging");
    });

    const col = lists[t.priority] || lists.normal;
    col.appendChild(todo_element);
  }

  // Drag-over / drop auf jeder Spalte
  for (const [prio, list] of Object.entries(lists)) {
    const col = list.closest(".priority-column");
    col.ondragover = (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    };
    col.ondragleave = () => col.classList.remove("drag-over");
    col.ondrop = (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      if (!draggingId) return;
      const todo = todos.find((t) => t.id === draggingId);
      if (todo && todo.priority !== prio) {
        todo.priority = prio;
        save_into_storage();
        render_todos();
      }
      draggingId = null;
    };
  }
}

function save_into_storage() {
  localStorage.setItem("savedTodos", JSON.stringify(todos));
}

function load_from_storage() {
  try {
    if (localStorage.getItem("savedTodos") != undefined) {
      todos = JSON.parse(localStorage.getItem("savedTodos"));
      render_todos();
    }
  } catch (error) {
    console.log(error);
  }
}

// Modal öffnen via Delegation
document.addEventListener("click", (e) => {
  const el = e.target.closest(".todo-element");
  if (!el) return;
  const todo = todos.find((t) => t.id === el.dataset.id);
  if (!todo) return;
  open_modal(todo);
});

// Modal schließen
modal_close.addEventListener("click", close_modal);
todo_modal.addEventListener("click", (e) => {
  if (e.target === todo_modal) close_modal();
});
new_modal.addEventListener("click", (e) => {
  if (e.target === new_modal) close_modal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close_modal();
});

modal_save.addEventListener("click", () => {
  const todo = todos.find((t) => t.id === activeTodoId);
  if (!todo) return;
  todo.description = document.getElementById("modal_description").value;
  todo.due_date = document.getElementById("modal_due_date").value;
  todo.done = modal_done_check.checked;
  save_into_storage();
  render_todos();
  close_modal();
});

modal_delete.addEventListener("click", () => {
  todos = todos.filter((t) => t.id !== activeTodoId);
  save_into_storage();
  render_todos();
  close_modal();
});

function open_modal(todo = null) {
  if (!todo) {
    todo_modal.setAttribute("hidden", "");
    new_modal.removeAttribute("hidden");
    return;
  }

  new_modal.setAttribute("hidden", "");
  activeTodoId = todo.id;
  document.getElementById("modal_name").textContent = todo.name;
  document.getElementById("modal_description").value = todo.description || "";
  document.getElementById("modal_due_date").value = todo.due_date || "";
  modal_done_check.checked = todo.done;

  const countdownEl = document.getElementById("modal_countdown");
  start_countdown(countdownEl, todo.due_date);

  // Countdown live aktualisieren wenn Datum geändert wird
  document.getElementById("modal_due_date").oninput = (e) => {
    start_countdown(countdownEl, e.target.value);
  };

  todo_modal.removeAttribute("hidden");
}

function start_countdown(el, due_date) {
  clearInterval(countdownInterval);
  if (due_date) {
    const update = () => render_countdown(el, due_date);
    update();
    countdownInterval = setInterval(update, 1000);
  } else {
    el.textContent = "";
  }
}

function close_modal() {
  new_modal.setAttribute("hidden", "");
  todo_modal.setAttribute("hidden", "");
  clearInterval(countdownInterval);
}

function render_countdown(el, due_date) {
  const now = Date.now();
  // Fallback für alte Todos ohne Uhrzeit
  const due = new Date(
    due_date.includes("T") ? due_date : due_date + "T23:59:59",
  ).getTime();
  const diff = due - now;

  if (diff <= 0) {
    el.innerHTML = `<span class="countdown-overdue">Fällig – überfällig!</span>`;
    clearInterval(countdownInterval);
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const ref = new Date(now - diff).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  el.innerHTML = `
        <div>Noch bis zum Fälligkeitsdatum:</div>
        <div class="countdown-units">
            <div class="countdown-unit"><span>${days}</span><span>Tage</span></div>
            <div class="countdown-unit"><span>${hours}</span><span>Stunden</span></div>
            <div class="countdown-unit"><span>${minutes}</span><span>Min</span></div>
            <div class="countdown-unit"><span>${seconds}</span><span>Sek</span></div>
        </div>
        <div class="countdown-ref">&#8596; entspricht dem Zeitraum seit ${ref}</div>`;
}

// Init
window.onload = () => {
  load_from_storage();
};
