package forms

case class SensorVerification(
	valLow : BigDecimal,
	valHigh : BigDecimal,
	time: Int,
	sensorUri: List[String],
	numItems: Int
)

import models._
import play.api.data._
import play.api.data.Forms._

object SensorVerificationForm {
	
  def apply() = {
    Form(
        mapping(
            "valLow" -> bigDecimal,
            "valHigh" -> bigDecimal,
            "time" -> number,
            "sensorUri" -> list(text),
            "numItems" -> number
        )(SensorVerification.apply)(SensorVerification.unapply)
    )
  }
  
}