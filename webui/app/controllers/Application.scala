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

object Application extends Controller {

	val serviceURL = "http://thingsurf.dyndns.org:1180/search/css"
	val verificationURL = "http://thingsurf.dyndns.org:1180/verification/sensor"
		
	/**
	 * This is to support async action.
	 */
	implicit val context = scala.concurrent.ExecutionContext.Implicits.global
	
	def index = Action {
		Ok(views.html.index("Welcome to ThingSurf - Surfing the Internet of Things!"))
	}

	/**
	 * Action.async is a helper function that return an asynchronous action, which produce
	 * a Future[SimpleResult]
	 */
	def doSearch(rStart: Float, rEnd: Float, duration: Integer, k: Integer) = Action.async {
		val targetURL = serviceURL + "/" + rStart + "/" + rEnd //+ "/" + duration + "/" + k;
		Logger.info(targetURL);
		val holder: WSRequestHolder = WS.url(targetURL)
		val response = holder.get().map {
			resp => resp.json.toString
		}

		response.map(s => Ok(s).as("json"))
	}
	
	def verifySensors(data : SensorVerification) : Future[SimpleResult] = {
		
		val targetURL = verificationURL + "/" + data.valLow + "/" + data.valHigh + "/" + data.time  
		
		var jsResponse : JsArray = JsArray()
		
		// for each of the uri, call the verification server
		data.sensors.foreach( sensor => {
			// accumulate the returned json value to the list of responses
			val holder: WSRequestHolder = WS.url(targetURL)
			
			val uri = sensor.sensorUri
			val lssId = sensor.lssId
			val sds = sensor.sds
			
			val payLoad = Json.obj("uri" -> uri, "lssId" -> lssId, "sds" -> sds)
			
			val response = holder.post(payLoad.toString())
			
			val futr = response.map { resp =>
				jsResponse = jsResponse.append(Json.obj("uri" -> uri, "veriResult" -> resp.json))
			}
			
			// await the response to complete before return, so that we can verify sequentially
			Await.result(futr, Duration.Inf)
		})
		
		//Logger.info("---" + jsResponse.toString)
		
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