//Variable para diferenciar si el evento es click o drag
const BASE_SERVER_URL = "http://localhost:80/API_Reto";
const NOTE_COLOR_DEFAULT = "#eae672";
const IND_ACTIVO = 'S';

var dragCheck = false;
var indPrimerRendered = 0;
var documentoPDF = {};

$(function () {
	document.addEventListener("pagerendered", function(event){
		var pageContainer = $(event.target)
		var pagina = pageContainer.attr("data-page-number");

		pageContainer.droppable({
			drop: dropHandler
		});

		if(indPrimerRendered == 0 && !documentoPDF.idDocumento){
			indPrimerRendered++;
			generarDocumentoPDF(pagina);
		}

		if(indPrimerRendered > 0 && documentoPDF.idDocumento){
			mostrarNotasregistradas(pagina);
		}
	});
	
	$("#draggable").draggable({
		helper: 'clone',
		containment: $("div.page"),
		drag: function(event, ui){
			ui.helper.find("span.pin").addClass("pin-red");
		}
	});

	$("div.page").droppable({
		drop: dropHandler
	});

	activarPins();

});

function generarDocumentoPDF(pagina){
	$.ajax({
		method: "GET",
		url: BASE_SERVER_URL + "/documento/url?url=" + encodeURI(PDFViewerApplication.url),
		dataType: 'json'
	}).done(function(response){
		documentoPDF = response;
		mostrarNotasregistradas(pagina);
	}).fail(function(response) {
		if(response.status != 404)
			alert( "Error al buscar registro de Documento => " + response.responseJSON.message);
		else
			saveDocumentoPDF();
	});
}

function saveDocumentoPDF(){
	$.ajax({
		method: "POST",
		url: BASE_SERVER_URL + "/documento",
		contentType : 'application/json;charset=UTF-8',
		dataType: 'json',
		data: JSON.stringify({
			url: PDFViewerApplication.url,
			cantidadPaginas: PDFViewerApplication.pagesCount
		})
	}).done(function(response){
		documentoPDF = response;
	}).fail(function(response) {
		alert( "Error al registrar Documento => " + response.responseJSON.message);
	});
}


function mostrarNotasregistradas(pagina){
	$.ajax({
		method: "GET",
		url: BASE_SERVER_URL + "/documento/url?url=" + encodeURI(PDFViewerApplication.url),
		dataType: 'json'
	}).done(function(response){
		documentoPDF = response;
		$.each(documentoPDF.notas, function(index, nota){
			if(nota.pagina == pagina)
				crearNotaRegistrada(nota);
		});

	}).fail(function(response) {
		alert( "Error al buscar notas registradas de Documento => " + response.responseJSON.message);
	});
}

function crearNotaRegistrada(nota){
	var pageContainer = $("div.page[data-page-number=" + nota.pagina + "]");
	var clone = creatCloneDraggable( $("#draggable"), pageContainer);
	clone.attr("id", nota.idNota);
	clone.css("top", nota.top);
	clone.css("left", nota.left);
	pageContainer.append(clone);
	clone.find("blockquote").removeClass("visible");
	clone.find("blockquote").addClass("hidden");
	clone.find("textarea").val(nota.contenido);
}

function dropHandler(event, ui){
	if (ui.draggable[0].id === "draggable") {

		var pagina = $(this).attr("data-page-number");
		var top = ui.position.top - $(this).offset().top;
		var left = ui.position.left - $(this).offset().left;
		var clone = creatCloneDraggable(ui.draggable, this);
		
		var scope = this;
		$.ajax({
			method: "POST",
			url: BASE_SERVER_URL + "/nota",
			contentType : 'application/json; charset=UTF-8',
			dataType: 'json',
			data: JSON.stringify({
				idDocumento: documentoPDF.idDocumento,
				pagina: pagina,
				top: top,
				left: left,
				contenido: "",
				color: NOTE_COLOR_DEFAULT,
				indActivo: IND_ACTIVO
			})
		}).done(function(response){
			var nota = response;
			clone.attr("id", nota.idNota);
			clone.css("top", nota.top);
			clone.css("left", nota.left);
			$(scope).append(clone);
			clone.find("textarea").click();

		}).fail(function(response) {
			alert( "Error al registrar Nota => " + response.responseJSON.message);
		});

	}
}

function creatCloneDraggable(element, scope){
	var clone = $(element).clone();
	clone.removeAttr("id");
	clone.removeClass("draggable-container");
	clone.addClass("note-container");
	clone.find("blockquote").removeClass("hidden");
	clone.find("blockquote").addClass("visible");
	clone.css("position", "absolute");
	clone.find("span.pin").mouseup(clickPinHandler);
	clone.find("button.save").click(saveNoteHandler);
	clone.find("button.delete").click(deleteNoteHandler);
	clone.draggable({
		helper: 'original',
		containment: scope, 
		drag: function () {
			dragCheck = true;
		},
		stop: function () {
			dragCheck = false;
		}
	});

	var textarea = clone.find("textarea");
	textarea.click(editarNota);
	textarea.blur(salirEditarNota);
	autosize(textarea);

	return clone;
}

function activarPins() {
	$(".note-container > span.pin").mouseup(clickPinHandler);
}

function clickPinHandler(event) {
	var noteContainer = event.target.parentNode;
	if (dragCheck === false) {
		maximizeMinimizeNota(noteContainer);
	} else {
		actualizarPosicionNota(noteContainer)
	}
}

function maximizeMinimizeNota(noteConteiner){
	var blockquote = $(noteConteiner).find("blockquote.note");
	if (blockquote.hasClass("visible")) {
		blockquote.removeClass("visible");
		blockquote.addClass("hidden");
	} else {
		blockquote.removeClass("hidden");
		blockquote.addClass("visible");
	}
}

function editarNota(event){
	$(this).attr("readonly", false);
	$(this).focus();
	//var noteContainer = $(event.target.parentNode.parentNode);
}

function salirEditarNota(event){
	var noteContainer = event.target.parentNode.parentNode;
	$(event.target).attr("readonly", true);
	//$(noteContainer).find("button.save").click();
}

function saveNoteHandler(event){
	var noteContainer = event.target.parentNode.parentNode.parentNode;
	if(event.target.tagName === "SPAN")
		noteContainer = noteContainer.parentNode;

	$.ajax({
		method: "PATCH",
		url: BASE_SERVER_URL + "/nota/" + noteContainer.id,
		contentType : 'application/json; charset=UTF-8',
		dataType: 'json',
		data: JSON.stringify({
			contenido: $(noteContainer).find("textarea").val()
		})
	}).done(function(response){
		alert("nota actualizada!");
	}).fail(function(response) {
		alert( "Error al registrar Nota => " + response.responseJSON.message);
	});
}

function actualizarPosicionNota(noteContainer){
	var pagina = $(noteContainer.parentNode).attr("data-page-number");
	var top = $(noteContainer).position().top;
	var left = $(noteContainer).position().left;

	$.ajax({
		method: "PATCH",
		url: BASE_SERVER_URL + "/nota/" + noteContainer.id,
		contentType : 'application/json; charset=UTF-8',
		dataType: 'json',
		data: JSON.stringify({
			pagina: pagina,
			top: top,
			left: left
		})
	}).done(function(response){
		alert("nota actualizada!");
	}).fail(function(response) {
		alert( "Error al registrar Nota => " + response.responseJSON.message);
	});
}


function deleteNoteHandler(event){
	var noteContainer = event.target.parentNode.parentNode.parentNode;
	if(event.target.tagName === "SPAN")
		noteContainer = noteContainer.parentNode;

	$.ajax({
		method: "DELETE",
		url: BASE_SERVER_URL + "/nota/" + noteContainer.id,
		contentType : 'application/json; charset=UTF-8',
		dataType: 'json',
	}).done(function(response){
		$(noteContainer.parentNode).find(noteContainer).remove();
	}).fail(function(response) {
		alert( "Error al Eliminar Nota => " + response.responseJSON.message);
	});

}
