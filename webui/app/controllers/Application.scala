package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.Logger
import play.api.libs.ws._
import scala.concurrent.Future
import play.api.libs.ws.WS.WSRequestHolder
import forms._
import scala.concurrent._
import scala.concurrent.duration._
import play.mvc.Http

object Application extends Controller {

	val serviceURL = "http://thingsurf.dyndns.org:1180/search/css"
	val verificationURL = "http://thingsurf.dyndns.org:1180/verification/sensor"
		
	/**
	 * This is to support async action.
	 */
	implicit val context = scala.concurrent.ExecutionContext.Implicits.global
	
	def index = Action {
		Ok(views.html.index("ThingSurf - Search Engine for the Internet of Things, Web of Things, and Sensor Data Clouds!"))
	}

	/**
	 * Action.async is a helper function that return an asynchronous action, which produce
	 * a Future[SimpleResult]
	 */
	def doSearch(rStart: Float, rEnd: Float, duration: Integer, k: Integer) = Action.async { request =>
		val targetURL = serviceURL + "/" + rStart + "/" + rEnd //+ "/" + duration + "/" + k;
		Logger.info("From "+request.remoteAddress+", q = ["+rStart+", "+rEnd+"]");
		val holder: WSRequestHolder = WS.url(targetURL)
		val response = holder.get().map {
			resp => resp.json.toString
		}

		response.map(s => Ok(s).as("json"))
	}
	
	def verifySensors(data : SensorVerification) : Future[SimpleResult] = {
		
		val targetURL = verificationURL + "/" + data.valLow + "/" + data.valHigh + "/" + data.time  
		
		var jsResponse : JsArray = JsArray()
		
		// this is a very complicated part
		// here, we first convert the data.sensors into a parallel collection
		// using aggregate to transform each sensor data into the verification result (in the form
		// of json object) and append it to the json array represented in jsRes
		// the combination function (x, y) will combine two jsArray into one.
		jsResponse = data.sensors.par.aggregate(jsResponse)( (jsRes, sensor) => {
			// accumulate the returned json value to the list of responses
			val holder: WSRequestHolder = WS.url(targetURL)
			
			val uri = sensor.sensorUri
			val lssId = sensor.lssId
			val sds = sensor.sds
			val uiId = sensor.uiId
			
			//Logger.info(""+uiId);
			
			val payLoad = Json.obj("uri" -> uri, "lssId" -> lssId, "sds" -> sds)
			
			val response = holder.post(payLoad.toString())
			
			Await.result(response.map { resp =>
				jsRes.append(Json.obj("uiId" -> uiId, "uri" -> uri, "veriResult" -> resp.json))
			}, Duration.Inf)

		}, (x, y) => {
		  x ++ y
		})
		
		//Logger.info("-------")
		
		return Future(Ok(jsResponse));
	}

	def doVerification = Action.async { implicit request =>
		SensorVerificationForm().bindFromRequest.fold(
			// if the form is not 
			formWithErrors => {
				val json = Json.obj(
					"status" -> -1, 
					"message" -> "Error in the submited form"
				);
				Future(BadRequest(json))
			},
			// if the form is correct!
			userData => {
				verifySensors(userData)
			}
		)
	}

	def routes = Action { implicit request =>
		Ok(Routes.javascriptRouter("jsRoutes")(
			controllers.routes.javascript.Application.doSearch,
			controllers.routes.javascript.Application.index,
			controllers.routes.javascript.Application.doVerification)).as("text/javascript");
	}

}